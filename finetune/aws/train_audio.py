"""
Aiscern — Audio Deepfake Detector Fine-tuning
AWS g5.xlarge (A10G 24GB) or p3.2xlarge (V100 16GB)

Run:
  export HF_TOKEN='hf_...'
  screen -S audio
  python3 train_audio.py
  Ctrl+A, D  (detach — training continues even if SSH drops)

Resume after disconnect:
  screen -r audio
"""

import os, sys, logging
import numpy as np
import torch
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
log = logging.getLogger(__name__)

# ── CONFIG ────────────────────────────────────────────────────────────────────
HF_TOKEN          = os.environ.get('HF_TOKEN', '')
if not HF_TOKEN:
    sys.exit("❌ Set HF_TOKEN environment variable first: export HF_TOKEN='hf_...'")

BASE_MODEL        = 'facebook/wav2vec2-base'
PUSH_REPO         = 'saghi776/aiscern-audio-detector'
CHECKPOINT_DIR    = os.path.expanduser('~/aiscern-finetune/audio-checkpoints')
SAMPLE_RATE       = 16000
MAX_DURATION_S    = 5
MAX_LEN           = SAMPLE_RATE * MAX_DURATION_S

# A10G 24GB can fit batch=32 for wav2vec2-base (vs batch=16 on T4)
# V100 16GB can also fit batch=32
BATCH_SIZE        = 32
EPOCHS            = 20
LR                = 2e-4
WARMUP_RATIO      = 0.06
WEIGHT_DECAY      = 0.01
SEED              = 42
SAMPLES_PER_CLASS = 81474   # all available (162,948 ÷ 2)

os.makedirs(CHECKPOINT_DIR, exist_ok=True)
os.environ['HF_TOKEN'] = HF_TOKEN

device = 'cuda' if torch.cuda.is_available() else 'cpu'
if device == 'cuda':
    gpu = torch.cuda.get_device_name(0)
    mem = torch.cuda.get_device_properties(0).total_memory / 1e9
    log.info(f"GPU: {gpu} ({mem:.1f} GB) — batch={BATCH_SIZE}, epochs={EPOCHS}")
else:
    log.warning("No GPU detected — running on CPU (very slow)")

# ── LOAD DATASETS ─────────────────────────────────────────────────────────────
from datasets import load_dataset, concatenate_datasets, Audio

def normalise_label(val):
    s = str(val).lower().strip()
    if s in ('spoof','spoofed','fake','ai','1','generated','synthetic'): return 1
    if s in ('bonafide','genuine','real','human','0'):                   return 0
    return -1

log.info("Loading datasets...")
all_splits = []

dataset_configs = [
    ('DynamicSuperb/AudioDeepfakeDetection_ASVspoof2019LA', 'train'),
    ('balt0/WaveFake',                                      'train'),
    ('motheecreator/in-the-wild-audio-deepfake',            'train'),
    ('mozilla-foundation/common_voice_11_0',                'train'),
    ('openslr/librispeech_asr',                             'train.100'),
]

for ds_id, split in dataset_configs:
    try:
        kwargs = {'split': split, 'token': HF_TOKEN, 'trust_remote_code': False}
        if 'common_voice' in ds_id:
            kwargs['name'] = 'en'
        if 'librispeech' in ds_id:
            kwargs['name'] = 'clean'

        ds = load_dataset(ds_id, **kwargs)
        ds = ds.cast_column('audio', Audio(sampling_rate=SAMPLE_RATE))

        # Map labels
        lbl_col = next((c for c in ds.column_names if 'label' in c.lower()), None)

        if ds_id == 'balt0/WaveFake':
            ds = ds.map(lambda x: {'label': 1})  # all fake
        elif ds_id in ('mozilla-foundation/common_voice_11_0', 'openslr/librispeech_asr'):
            ds = ds.map(lambda x: {'label': 0})  # all real
        elif lbl_col:
            ds = ds.map(lambda x: {'label': normalise_label(x[lbl_col])})
            ds = ds.filter(lambda x: x['label'] != -1)

        keep_cols = ['audio', 'label']
        ds = ds.select_columns([c for c in keep_cols if c in ds.column_names])

        # Cap real speech datasets to avoid imbalance
        if ds_id in ('mozilla-foundation/common_voice_11_0', 'openslr/librispeech_asr'):
            ds = ds.shuffle(SEED).select(range(min(100000, len(ds))))

        all_splits.append(ds)
        r = ds.filter(lambda x: x['label'] == 0).num_rows
        f = ds.filter(lambda x: x['label'] == 1).num_rows
        log.info(f"  ✅ {ds_id.split('/')[-1]}: {len(ds):,} (real={r:,} fake={f:,})")

    except Exception as e:
        log.warning(f"  ⚠️  {ds_id.split('/')[-1]} skipped: {e}")

if not all_splits:
    sys.exit("❌ No datasets loaded")

combined = concatenate_datasets(all_splits)
real = combined.filter(lambda x: x['label'] == 0).shuffle(SEED)
fake = combined.filter(lambda x: x['label'] == 1).shuffle(SEED)
n    = min(len(real), len(fake), SAMPLES_PER_CLASS)
log.info(f"Balancing: {n:,} per class = {n*2:,} total")

balanced = concatenate_datasets([real.select(range(n)), fake.select(range(n))]).shuffle(SEED)
split    = balanced.train_test_split(test_size=0.1, seed=SEED)
train_ds = split['train']
eval_ds  = split['test']
log.info(f"Train: {len(train_ds):,}  Eval: {len(eval_ds):,}")

# ── FEATURE EXTRACTION ────────────────────────────────────────────────────────
from transformers import Wav2Vec2FeatureExtractor

extractor = Wav2Vec2FeatureExtractor.from_pretrained(BASE_MODEL, token=HF_TOKEN)

def preprocess(batch):
    arrays = []
    for item in batch['audio']:
        arr = np.array(item['array'], dtype=np.float32)
        arr = arr[:MAX_LEN]
        if len(arr) < SAMPLE_RATE:
            arr = np.pad(arr, (0, SAMPLE_RATE - len(arr)))
        rms = np.sqrt(np.mean(arr**2))
        if rms > 0:
            arr = arr / (rms + 1e-8) * 0.1
        arrays.append(arr)
    inputs = extractor(
        arrays, sampling_rate=SAMPLE_RATE, return_tensors='np',
        padding='max_length', max_length=MAX_LEN, truncation=True,
        return_attention_mask=True,
    )
    batch['input_values']   = inputs.input_values
    batch['attention_mask'] = inputs.attention_mask
    return batch

log.info("Extracting features (runs on CPU, ~20min for full dataset)...")
# Use more workers on AWS (no sandbox restrictions)
train_ds = train_ds.map(preprocess, batched=True, batch_size=64,
                         remove_columns=['audio'], num_proc=4,
                         desc='Train features')
eval_ds  = eval_ds.map(preprocess,  batched=True, batch_size=64,
                         remove_columns=['audio'], num_proc=4,
                         desc='Eval features')
train_ds.set_format('torch')
eval_ds.set_format('torch')

# Cache to disk so we don't redo this if instance restarts
train_ds.save_to_disk(f'{CHECKPOINT_DIR}/train_features')
eval_ds.save_to_disk(f'{CHECKPOINT_DIR}/eval_features')
log.info("Features cached to disk ✅")

# ── MODEL + LoRA ──────────────────────────────────────────────────────────────
from transformers import Wav2Vec2ForSequenceClassification
from peft import LoraConfig, get_peft_model, TaskType

model = Wav2Vec2ForSequenceClassification.from_pretrained(
    BASE_MODEL,
    num_labels=2,
    id2label={0: 'real', 1: 'fake'},
    label2id={'real': 0, 'fake': 1},
    ignore_mismatched_sizes=True,
    token=HF_TOKEN,
)
model.freeze_feature_extractor()

# Larger LoRA rank on A10G/V100 — more capacity, same memory cost
lora_cfg = LoraConfig(
    task_type=TaskType.SEQ_CLS,
    r=32,          # doubled from 16 — A10G 24GB has headroom
    lora_alpha=64,
    lora_dropout=0.1,
    bias='none',
    target_modules=['q_proj', 'v_proj', 'k_proj', 'out_proj'],
)
model = get_peft_model(model, lora_cfg)
model.print_trainable_parameters()
model = model.to(device)

# ── TRAIN ─────────────────────────────────────────────────────────────────────
from transformers import TrainingArguments, Trainer, EarlyStoppingCallback
import evaluate

acc = evaluate.load('accuracy')
f1  = evaluate.load('f1')

def compute_metrics(ep):
    preds = np.argmax(ep.predictions, axis=-1)
    return {
        'accuracy': acc.compute(predictions=preds, references=ep.label_ids)['accuracy'],
        'f1':       f1.compute(predictions=preds, references=ep.label_ids, average='binary')['f1'],
    }

# Check for existing checkpoint to resume
import glob
checkpoints = sorted(glob.glob(f'{CHECKPOINT_DIR}/checkpoint-*'))
last_ckpt   = checkpoints[-1] if checkpoints else None
if last_ckpt:
    log.info(f"Resuming from checkpoint: {last_ckpt}")

training_args = TrainingArguments(
    output_dir                  = CHECKPOINT_DIR,
    num_train_epochs            = EPOCHS,
    per_device_train_batch_size = BATCH_SIZE,
    per_device_eval_batch_size  = BATCH_SIZE,
    learning_rate               = LR,
    warmup_ratio                = WARMUP_RATIO,
    weight_decay                = WEIGHT_DECAY,
    eval_strategy               = 'epoch',
    save_strategy               = 'epoch',
    save_total_limit            = 3,
    load_best_model_at_end      = True,
    metric_for_best_model       = 'f1',
    greater_is_better           = True,
    push_to_hub                 = True,
    hub_model_id                = PUSH_REPO,
    hub_token                   = HF_TOKEN,
    hub_strategy                = 'every_save',
    fp16                        = True,          # A10G/V100 both support fp16
    dataloader_num_workers      = 8,             # AWS has more CPUs than Colab
    dataloader_pin_memory       = True,
    report_to                   = 'none',
    logging_steps               = 50,
    seed                        = SEED,
)

trainer = Trainer(
    model           = model,
    args            = training_args,
    train_dataset   = train_ds,
    eval_dataset    = eval_ds,
    compute_metrics = compute_metrics,
    callbacks       = [EarlyStoppingCallback(early_stopping_patience=3)],
)

log.info(f"Starting training: {len(train_ds):,} samples × {EPOCHS} epochs")
log.info(f"Estimated time on A10G: ~8h  |  V100: ~6h  |  T4: ~14h")
log.info(f"Training continues even if SSH disconnects (running in screen)")
trainer.train(resume_from_checkpoint=last_ckpt)

# ── EVALUATE + PUSH ───────────────────────────────────────────────────────────
results = trainer.evaluate()
log.info(f"Accuracy: {results['eval_accuracy']:.4f}  F1: {results['eval_f1']:.4f}")

trainer.push_to_hub(commit_message=f"Audio detector — acc={results['eval_accuracy']:.4f}")
extractor.push_to_hub(PUSH_REPO, token=HF_TOKEN)

log.info(f"✅ Model live: https://huggingface.co/{PUSH_REPO}")
log.info(f"Cost on g5.xlarge spot: ~${8 * 0.302:.2f}")
