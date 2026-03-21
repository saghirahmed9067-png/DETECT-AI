"""
Aiscern — Video Deepfake Detector Fine-tuning
AWS g5.xlarge (A10G 24GB) — no session limits, no Colab disconnects

Run:
  export HF_TOKEN='hf_...'
  screen -S video
  python3 train_video.py

Ctrl+A, D to detach — training continues in background
screen -r video   to re-attach
"""

import os, sys, logging, random
import numpy as np
import torch
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
log = logging.getLogger(__name__)

HF_TOKEN          = os.environ.get('HF_TOKEN', '')
if not HF_TOKEN: sys.exit("❌ Set HF_TOKEN first")

BASE_MODEL        = 'google/vit-base-patch16-224'
PUSH_REPO         = 'saghi776/aiscern-video-detector'
CHECKPOINT_DIR    = os.path.expanduser('~/aiscern-finetune/video-checkpoints')
IMG_SIZE          = 224
# A10G 24GB: can handle batch=64 for ViT-base (vs Colab T4's 16)
# More headroom → larger LoRA rank → better accuracy
BATCH_SIZE        = 64
EPOCHS            = 10   # more epochs vs Colab's 8 (no session limit)
LR                = 2e-4
SEED              = 42
SAMPLES_PER_CLASS = 77614    # all available (155k ÷ 2)

os.makedirs(CHECKPOINT_DIR, exist_ok=True)
os.environ['HF_TOKEN'] = HF_TOKEN
device = 'cuda' if torch.cuda.is_available() else 'cpu'

gpu = torch.cuda.get_device_name(0) if device == 'cuda' else 'CPU'
mem = torch.cuda.get_device_properties(0).total_memory / 1e9 if device == 'cuda' else 0
log.info(f"GPU: {gpu} ({mem:.1f}GB) | batch={BATCH_SIZE} | epochs={EPOCHS}")
log.info(f"No session limits on AWS — training runs uninterrupted")

# ── DATASETS ──────────────────────────────────────────────────────────────────
from datasets import load_dataset, concatenate_datasets

def normalise_label(val):
    s = str(val).upper().strip()
    if s in ('FAKE','AI','1','DEEPFAKE','GENERATED','SYNTHETIC'): return 1
    if s in ('REAL','HUMAN','0','AUTHENTIC','GENUINE'):            return 0
    return -1

def validate_labels(ds, name):
    """Hard check: reject any dataset whose labels aren't real/fake"""
    mapped = [normalise_label(ds[i]['label']) for i in range(min(20, len(ds)))]
    if -1 in mapped or len(set(mapped)) < 2:
        log.warning(f"  ❌ {name}: bad labels {set(str(ds[i]['label']) for i in range(5))} — skipping")
        return False
    return True

log.info("Loading datasets...")
all_splits = []

for ds_id in [
    'arnabdhar/DeepFake-Vs-Real-Faces',
    'marcelomoreno26/deepfake-detection',
    'haywhy/celeb-df-v2',
    'jlbaker361/cifake-real-and-ai-generated-small-images',  # fallback
]:
    try:
        ds = load_dataset(ds_id, split='train', token=HF_TOKEN)
        img_col = next((c for c in ds.column_names if c.lower() in ('image','img','face','photo')), None)
        lbl_col = next((c for c in ds.column_names if 'label' in c.lower()), None)
        if not img_col or not lbl_col:
            log.warning(f"  ⚠️  {ds_id.split('/')[-1]}: missing columns"); continue
        if img_col != 'image': ds = ds.rename_column(img_col, 'image')
        ds = ds.map(lambda x: {'label': normalise_label(x[lbl_col])})
        ds = ds.filter(lambda x: x['label'] != -1)
        ds = ds.select_columns(['image','label'])
        if not validate_labels(ds, ds_id.split('/')[-1]): continue
        r = ds.filter(lambda x: x['label']==0).num_rows
        f = ds.filter(lambda x: x['label']==1).num_rows
        assert r > 100 and f > 100, f"Too few samples: real={r} fake={f}"
        all_splits.append(ds)
        log.info(f"  ✅ {ds_id.split('/')[-1]}: {len(ds):,} (real={r:,} fake={f:,})")
    except Exception as e:
        log.warning(f"  ⚠️  {ds_id.split('/')[-1]} skipped: {e}")

if not all_splits: sys.exit("❌ No datasets loaded")

combined = concatenate_datasets(all_splits)
real = combined.filter(lambda x: x['label']==0).shuffle(SEED)
fake = combined.filter(lambda x: x['label']==1).shuffle(SEED)
n    = min(len(real), len(fake), SAMPLES_PER_CLASS)
# Final label safety check
assert set([0,1]) == set(combined.unique('label')), "Labels must be exactly {0,1}"
balanced = concatenate_datasets([real.select(range(n)), fake.select(range(n))]).shuffle(SEED)
split = balanced.train_test_split(test_size=0.1, seed=SEED)
train_ds, eval_ds = split['train'], split['test']
log.info(f"Train: {len(train_ds):,}  Eval: {len(eval_ds):,}")

# ── FEATURE EXTRACTION ────────────────────────────────────────────────────────
from transformers import ViTImageProcessor
from PIL import Image as PILImage, ImageEnhance

processor = ViTImageProcessor.from_pretrained(BASE_MODEL, token=HF_TOKEN)

def to_pil(img):
    if isinstance(img, PILImage.Image): return img.convert('RGB')
    return PILImage.fromarray(np.uint8(img)).convert('RGB')

def augment(img):
    img = to_pil(img).resize((IMG_SIZE, IMG_SIZE), PILImage.LANCZOS)
    if random.random() > 0.5: img = img.transpose(PILImage.FLIP_LEFT_RIGHT)
    if random.random() > 0.5: img = ImageEnhance.Brightness(img).enhance(random.uniform(0.85,1.15))
    if random.random() > 0.5: img = ImageEnhance.Contrast(img).enhance(random.uniform(0.85,1.15))
    if random.random() > 0.5: img = ImageEnhance.Sharpness(img).enhance(random.uniform(0.8,1.2))
    return img

def preprocess_train(batch):
    imgs = [augment(i) for i in batch['image']]
    batch['pixel_values'] = processor(images=imgs, return_tensors='np')['pixel_values']
    return batch

def preprocess_eval(batch):
    imgs = [to_pil(i).resize((IMG_SIZE,IMG_SIZE)) for i in batch['image']]
    batch['pixel_values'] = processor(images=imgs, return_tensors='np')['pixel_values']
    return batch

log.info("Extracting features (num_proc=4 on AWS)...")
train_ds = train_ds.map(preprocess_train, batched=True, batch_size=128,
                         remove_columns=['image'], num_proc=4, desc='Train')
eval_ds  = eval_ds.map(preprocess_eval,   batched=True, batch_size=128,
                         remove_columns=['image'], num_proc=4, desc='Eval')
train_ds.set_format('torch')
eval_ds.set_format('torch')

# ── MODEL + LoRA ──────────────────────────────────────────────────────────────
from transformers import ViTForImageClassification
from peft import LoraConfig, get_peft_model

model = ViTForImageClassification.from_pretrained(
    BASE_MODEL, num_labels=2,
    id2label={0:'real',1:'fake'}, label2id={'real':0,'fake':1},
    ignore_mismatched_sizes=True, token=HF_TOKEN,
)
# r=32 on A10G (Colab used r=8 due to T4 12GB memory constraint)
# Higher rank = more expressive LoRA = better accuracy
model = get_peft_model(model, LoraConfig(
    r=32, lora_alpha=64, lora_dropout=0.1, bias='none',
    target_modules=['query','value','key','dense'],
))
model.print_trainable_parameters()
model = model.to(device)

# ── TRAIN ─────────────────────────────────────────────────────────────────────
from transformers import TrainingArguments, Trainer, EarlyStoppingCallback
import evaluate, glob

acc = evaluate.load('accuracy')
f1  = evaluate.load('f1')
def compute_metrics(ep):
    preds = np.argmax(ep.predictions, axis=-1)
    return {
        'accuracy': acc.compute(predictions=preds, references=ep.label_ids)['accuracy'],
        'f1': f1.compute(predictions=preds, references=ep.label_ids, average='binary')['f1'],
    }

checkpoints = sorted(glob.glob(f'{CHECKPOINT_DIR}/checkpoint-*'))
last_ckpt   = checkpoints[-1] if checkpoints else None
if last_ckpt: log.info(f"Resuming from: {last_ckpt}")

training_args = TrainingArguments(
    output_dir=CHECKPOINT_DIR, num_train_epochs=EPOCHS,
    per_device_train_batch_size=BATCH_SIZE, per_device_eval_batch_size=BATCH_SIZE,
    learning_rate=LR, warmup_ratio=0.1, weight_decay=0.01,
    eval_strategy='epoch', save_strategy='epoch', save_total_limit=3,
    load_best_model_at_end=True, metric_for_best_model='f1',
    push_to_hub=True, hub_model_id=PUSH_REPO, hub_token=HF_TOKEN,
    hub_strategy='every_save', fp16=True,
    dataloader_num_workers=8, dataloader_pin_memory=True,
    report_to='none', logging_steps=50, seed=SEED,
    # No gradient accumulation needed — A10G handles batch=64 natively
)
trainer = Trainer(
    model=model, args=training_args,
    train_dataset=train_ds, eval_dataset=eval_ds,
    compute_metrics=compute_metrics,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
)

log.info(f"Training: {len(train_ds):,} × {EPOCHS} epochs | ~7h on A10G")
trainer.train(resume_from_checkpoint=last_ckpt)

results = trainer.evaluate()
log.info(f"Accuracy: {results['eval_accuracy']:.4f}  F1: {results['eval_f1']:.4f}")
trainer.push_to_hub(commit_message=f"Video detector — acc={results['eval_accuracy']:.4f}")
processor.push_to_hub(PUSH_REPO, token=HF_TOKEN)
log.info(f"✅ https://huggingface.co/{PUSH_REPO} | Cost: ~${7 * 0.302:.2f}")
