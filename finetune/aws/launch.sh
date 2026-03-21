#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Aiscern AWS Instance Launcher
# 
# USAGE:
#   chmod +x launch.sh
#   ./launch.sh
#
# REQUIRES:
#   aws cli configured: aws configure
#   Your AWS key pair name
# ═══════════════════════════════════════════════════════════════

set -e

# ── EDIT THESE ──────────────────────────────────────────────────
KEY_NAME="your-key-pair-name"         # ← your AWS key pair name
HF_TOKEN="YOUR_HF_TOKEN_HERE"         # ← your HuggingFace token
REGION="us-east-1"                    # cheapest region for spot
# ────────────────────────────────────────────────────────────────

INSTANCE_TYPE="g5.xlarge"             # A10G 24GB — best value
# Alternatives:
# "g4dn.xlarge"   T4  15GB  $0.157/hr spot — cheapest
# "p3.2xlarge"    V100 16GB $0.918/hr spot — fastest single GPU
# "p3.8xlarge"    4×V100    $3.67/hr spot  — all 3 in parallel

# Ubuntu 22.04 Deep Learning AMI (GPU) — pre-installed CUDA + PyTorch
AMI_ID="ami-0e01ce4ee18447326"  # us-east-1, update for other regions
# For us-west-2: ami-0ac8a5da4e3f33699
# Find latest: aws ec2 describe-images --owners amazon \
#   --filters "Name=name,Values=*Deep Learning AMI GPU PyTorch*" \
#   --query "sort_by(Images, &CreationDate)[-1].ImageId"

SECURITY_GROUP="sg-default"  # use default or create one with SSH (22) open

echo "═══════════════════════════════════════════════════════"
echo "Launching $INSTANCE_TYPE (spot) in $REGION"
echo "═══════════════════════════════════════════════════════"

# Check spot price first
SPOT_PRICE=$(aws ec2 describe-spot-price-history \
    --region $REGION \
    --instance-types $INSTANCE_TYPE \
    --product-descriptions "Linux/UNIX" \
    --query "SpotPriceHistory[0].SpotPrice" \
    --output text 2>/dev/null || echo "unknown")
echo "Current spot price: \$$SPOT_PRICE/hr"

# Create user data script (runs on instance startup)
cat > /tmp/userdata.sh << USERDATA
#!/bin/bash
set -e

# Set HF token
echo "export HF_TOKEN='${HF_TOKEN}'" >> /home/ubuntu/.bashrc
echo "export HF_TOKEN='${HF_TOKEN}'" >> /home/ubuntu/.profile

# Install dependencies
sudo -u ubuntu pip install -q \
    transformers==4.40.0 datasets peft==0.10.0 accelerate \
    evaluate scikit-learn soundfile librosa Pillow huggingface_hub \
    scipy numpy

# Clone repo
cd /home/ubuntu
sudo -u ubuntu git clone https://github.com/saghirahmed9067-png/DETECT-AI.git
cd DETECT-AI

# Create working directory
mkdir -p /home/ubuntu/aiscern-finetune

echo "Setup complete" >> /home/ubuntu/setup.log
USERDATA

# Launch spot instance
INSTANCE_ID=$(aws ec2 run-instances \
    --region $REGION \
    --image-id $AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --instance-market-options '{"MarketType":"spot","SpotOptions":{"SpotInstanceType":"one-time","InstanceInterruptionBehavior":"terminate"}}' \
    --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":100,"VolumeType":"gp3"}}]' \
    --user-data file:///tmp/userdata.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=aiscern-finetune},{Key=Project,Value=aiscern}]" \
    --query "Instances[0].InstanceId" \
    --output text)

echo "Instance launched: $INSTANCE_ID"
echo "Waiting for public IP..."
sleep 15

PUBLIC_IP=$(aws ec2 describe-instances \
    --region $REGION \
    --instance-ids $INSTANCE_ID \
    --query "Reservations[0].Instances[0].PublicIpAddress" \
    --output text)

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Instance ready: $PUBLIC_IP"
echo ""
echo "SSH command:"
echo "  ssh -i ~/.ssh/${KEY_NAME}.pem ubuntu@${PUBLIC_IP}"
echo ""
echo "After SSH, run:"
echo "  cd ~/DETECT-AI/finetune/aws"
echo "  export HF_TOKEN='${HF_TOKEN}'"
echo "  screen -S audio && python3 train_audio.py   # Ctrl+A,D to detach"
echo "  screen -S image && python3 train_image.py   # in new terminal"
echo "  screen -S video && python3 train_video.py   # in new terminal"
echo ""
echo "Monitor all sessions:"
echo "  screen -ls"
echo ""
echo "REMEMBER: Terminate instance when done!"
echo "  aws ec2 terminate-instances --region $REGION --instance-ids $INSTANCE_ID"
echo "═══════════════════════════════════════════════════════"
