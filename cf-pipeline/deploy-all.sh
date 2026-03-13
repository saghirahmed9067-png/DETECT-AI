#!/bin/bash
# DETECTAI Pipeline v5 — Deploy all 20 Workers
# Usage: CLOUDFLARE_API_TOKEN=xxx HF_TOKEN=xxx bash deploy-all.sh

set -e

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "❌  Missing CLOUDFLARE_API_TOKEN"
  echo "    Create at: https://dash.cloudflare.com/profile/api-tokens"
  echo "    Permission needed: Workers Scripts: Edit"
  exit 1
fi

if [ -z "$HF_TOKEN" ]; then
  echo "❌  Missing HF_TOKEN"
  echo "    Get at: https://huggingface.co/settings/tokens (write access)"
  exit 1
fi

echo "🚀  DETECTAI Pipeline v5 — Deploying 20 workers..."
echo "    Each worker runs every minute (cron */1)"
echo "    Worker 20 pushes to HuggingFace every 10 min"
echo ""

CONFIGS=(
  "wrangler.toml"       # Worker 1
  "wrangler-w2.toml"    # Worker 2
  "wrangler-w3.toml"    # Worker 3
  "wrangler-w4.toml"    # Worker 4
  "wrangler-w5.toml"    # Worker 5
  "wrangler-w6.toml"    # Worker 6
  "wrangler-w7.toml"    # Worker 7
  "wrangler-w8.toml"    # Worker 8
  "wrangler-w9.toml"    # Worker 9
  "wrangler-w10.toml"   # Worker 10
  "wrangler-w11.toml"   # Worker 11
  "wrangler-w12.toml"   # Worker 12
  "wrangler-w13.toml"   # Worker 13
  "wrangler-w14.toml"   # Worker 14
  "wrangler-w15.toml"   # Worker 15
  "wrangler-w16.toml"   # Worker 16
  "wrangler-w17.toml"   # Worker 17
  "wrangler-w18.toml"   # Worker 18
  "wrangler-w19.toml"   # Worker 19
  "wrangler-w20.toml"   # Worker 20 (HF push + cleanup)
)

DEPLOYED=0
FAILED=0

for cfg in "${CONFIGS[@]}"; do
  num="${cfg//[^0-9]/}"
  num="${num:-1}"
  echo "── Worker $num: deploying ($cfg)..."

  if npx wrangler deploy --config "$cfg" 2>&1; then
    # Set HF_TOKEN secret
    printf "%s" "$HF_TOKEN" | npx wrangler secret put HF_TOKEN --config "$cfg" 2>&1
    echo "   ✅  Worker $num deployed + secret set"
    DEPLOYED=$((DEPLOYED+1))
  else
    echo "   ❌  Worker $num FAILED"
    FAILED=$((FAILED+1))
  fi
  echo ""
done

echo "══════════════════════════════════════════════════════"
echo "✅  Deployed: $DEPLOYED / 20 workers"
[ "$FAILED" -gt 0 ] && echo "❌  Failed:   $FAILED workers"
echo ""
echo "📊  Expected throughput:"
echo "    19 scrapers × ~3 sources × 60 items × 1440 min = ~4.9M items/day"
echo "    Push: Worker 20 pushes every 10 min (up to 3000 items/push)"
echo ""
echo "🔗  Status endpoint:"
echo "    https://detectai-pipeline.workers.dev/status"
echo ""
echo "🔗  Health check all 20 workers:"
for i in $(seq 1 20); do
  name="detectai-pipeline"
  [ "$i" -gt 1 ] && name="detectai-pipeline-w$i"
  echo "    https://$name.workers.dev/health"
done
