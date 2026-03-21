#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Aiscern AWS Fine-tuning Setup Script
# Run this ONCE on a fresh Ubuntu 22.04 Deep Learning AMI instance
# ═══════════════════════════════════════════════════════════════

set -e
echo "═══════════════════════════════════════════════════════"
echo "Aiscern GPU Instance Setup"
echo "═══════════════════════════════════════════════════════"

# ── 1. System packages ──────────────────────────────────────
sudo apt-get update -q
sudo apt-get install -y -q git screen htop unzip awscli

# ── 2. Python dependencies ──────────────────────────────────
pip install --upgrade pip -q
pip install -q \
  transformers==4.40.0 \
  datasets \
  peft==0.10.0 \
  accelerate \
  evaluate \
  scikit-learn \
  soundfile \
  librosa \
  Pillow \
  huggingface_hub \
  torch torchvision torchaudio \
  bitsandbytes \
  scipy \
  numpy \
  wandb

echo "✅ Python packages installed"

# ── 3. Verify GPU ───────────────────────────────────────────
python3 -c "
import torch
if torch.cuda.is_available():
    gpu = torch.cuda.get_device_name(0)
    mem = torch.cuda.get_device_properties(0).total_memory / 1e9
    print(f'✅ GPU: {gpu} ({mem:.1f} GB VRAM)')
else:
    print('❌ No GPU — wrong instance type')
    exit(1)
"

# ── 4. Create working directory ─────────────────────────────
mkdir -p ~/aiscern-finetune
cd ~/aiscern-finetune
echo "✅ Working directory: ~/aiscern-finetune"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Setup complete. Now run:"
echo "  export HF_TOKEN='your_token_here'"
echo "  screen -S audio    # start detached session"
echo "  python3 train_audio.py"
echo "═══════════════════════════════════════════════════════"
