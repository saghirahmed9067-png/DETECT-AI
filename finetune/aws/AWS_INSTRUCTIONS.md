# Aiscern AWS Fine-tuning Guide
## $100 Credits — g5.xlarge Spot Instance

---

## Why AWS over Kaggle/Colab

| | Kaggle | Colab | AWS g5.xlarge |
|---|---|---|---|
| GPU | P100 16GB | T4 12GB | **A10G 24GB** |
| Session limit | None | 12h | **None** |
| Disconnects training | No | Yes | **No** |
| LoRA rank possible | 16 | 8 | **32** |
| Batch size | 16 | 16 | **64** |
| Cost | Free | Free | **$0.30/hr spot** |
| Full run cost | Free | Free | **~$5** |
| Runs with $100 | ∞ | ∞ | **~20 runs** |

---

## Step 1 — Configure AWS CLI (one time)

```bash
# Install AWS CLI
pip install awscli

# Configure with your credentials
aws configure
# AWS Access Key ID: (from AWS Console → IAM → My Security Credentials)
# AWS Secret Access Key: (same page)
# Default region: us-east-1
# Default output format: json
```

---

## Step 2 — Create Key Pair (one time)

```bash
# In AWS Console: EC2 → Key Pairs → Create key pair
# Name: aiscern-gpu
# Type: RSA, .pem format
# Save the .pem file to ~/.ssh/aiscern-gpu.pem
chmod 400 ~/.ssh/aiscern-gpu.pem
```

---

## Step 3 — Launch Instance

Edit `launch.sh`:
```bash
KEY_NAME="aiscern-gpu"                          # your key pair name
HF_TOKEN="YOUR_HF_TOKEN_HERE"  # your HF token
```

Then run:
```bash
chmod +x launch.sh
./launch.sh
```

This launches a **g5.xlarge spot instance** (~$0.30/hr):
- A10G 24GB GPU
- 100GB SSD storage
- Auto-installs all dependencies on startup

---

## Step 4 — Connect and Train

```bash
# SSH into instance (use IP from launch.sh output)
ssh -i ~/.ssh/aiscern-gpu.pem ubuntu@<PUBLIC_IP>

# Go to training scripts
cd ~/DETECT-AI/finetune/aws
export HF_TOKEN='YOUR_HF_TOKEN_HERE'

# Start all 3 in separate screen sessions (all run simultaneously!)
screen -S audio
python3 train_audio.py
# Press Ctrl+A, then D to detach (keeps running)

screen -S image
python3 train_image.py
# Ctrl+A, D

screen -S video
python3 train_video.py
# Ctrl+A, D

# Monitor all sessions
screen -ls
# Re-attach to check progress:
screen -r audio
```

---

## Training Times on g5.xlarge (A10G 24GB)

| Model | Dataset | Time | Cost |
|---|---|---|---|
| Audio (wav2vec2) | 162k × 20 epochs | ~8h | $2.40 |
| Image (ViT) | 78k × 10 epochs | ~1.3h | $0.39 |
| Video (ViT face crops) | 155k × 10 epochs | ~7h | $2.10 |
| **Total** | **all 3 parallel** | **~8h** | **$2.40** |

Running all 3 simultaneously = only pay for the longest one (audio).  
**Total cost: ~$2.40 per full training run**

---

## Step 5 — Terminate When Done!

```bash
# After training completes, terminate to stop billing
aws ec2 terminate-instances \
  --region us-east-1 \
  --instance-ids <INSTANCE_ID>
```

Or in AWS Console: EC2 → Instances → Select → Instance State → Terminate

**Models auto-push to HuggingFace as they train** (hub_strategy='every_save')  
So even if you terminate early, the latest checkpoint is already saved.

---

## Expected Accuracy (AWS vs Colab)

| Model | Colab (r=8, batch=16) | AWS (r=32, batch=64) |
|---|---|---|
| Audio | ~96% | **~97-98%** |
| Image | ~99% | **~99%** |
| Video | ~94% | **~96%** |

Higher LoRA rank (r=32 vs r=8) + bigger batch (64 vs 16) = better convergence.

---

## Budget Planning ($100)

- ~20 full training runs at $2.40/run
- Or ~5 runs on p3.2xlarge ($11/run, V100 = fastest)
- Or 1 run on p3.8xlarge ($14/run, 4×V100 = all parallel in 2h)

**Recommended**: Run once on g5.xlarge ($2.40), validate accuracy,  
then use remaining $97 for 40 more weekly retraining runs as pipeline adds data.

