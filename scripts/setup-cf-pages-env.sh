#!/bin/bash
# ============================================================
#  Aiscern — Cloudflare Pages Environment Variables Setup
#  Run this ONCE from your local machine after creating the
#  Pages project in the Cloudflare dashboard.
#
#  Requirements: Node.js + npx (wrangler is auto-downloaded)
#
#  Usage:
#    chmod +x scripts/setup-cf-pages-env.sh
#    CLOUDFLARE_API_TOKEN=4qbyOx4dHUdx_rcQwEtgKEwoTeZVIGLeGWsQwprh ./scripts/setup-cf-pages-env.sh
# ============================================================

set -e

PROJECT="aiscern"   # Must match your Cloudflare Pages project name
WRANGLER="npx wrangler@latest"

echo "🚀 Setting Cloudflare Pages environment variables for project: $PROJECT"
echo ""

# Helper — set a plain text env var (production + preview)
set_var() {
  local KEY=$1
  local VAL=$2
  echo "  ✔  $KEY"
  echo "$VAL" | $WRANGLER pages secret put "$KEY" --project-name="$PROJECT" 2>/dev/null
}

# ── Supabase ─────────────────────────────────────────────────
set_var NEXT_PUBLIC_SUPABASE_URL        "https://lpgzmruxaeikxxayjmze.supabase.co"
set_var NEXT_PUBLIC_SUPABASE_ANON_KEY   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZ3ptcnV4YWVpa3h4YXlqbXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNjE4OTIsImV4cCI6MjA4ODczNzg5Mn0.grbICfJk6vvJjLtcHecuA6X10kDwbaSFAejNHkvv2w0"
set_var SUPABASE_SERVICE_ROLE_KEY       "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZ3ptcnV4YWVpa3h4YXlqbXplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE2MTg5MiwiZXhwIjoyMDg4NzM3ODkyfQ.GTrqe030n4s53wY2CFCjkUSe3SOec-zNaFxITmA53Ls"

# ── Clerk ────────────────────────────────────────────────────
set_var NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY       "pk_live_Y2xlcmsuYWlzY2Vybi5jb20k"
set_var CLERK_SECRET_KEY                        "sk_live_q5OtwYSNsUTaYifrZdgNp0RatuZ1UKyDfb2pDvblg7"
set_var CLERK_WEBHOOK_SECRET                    "whsec_qf0DNZt2aulv9Y7RVXoOe7ayEvymg7jM"
set_var NEXT_PUBLIC_CLERK_SIGN_IN_URL           "/login"
set_var NEXT_PUBLIC_CLERK_SIGN_UP_URL           "/signup"
set_var NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL     "/dashboard"
set_var NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL "/dashboard"

# ── Cloudflare ───────────────────────────────────────────────
set_var CLOUDFLARE_ACCOUNT_ID           "34400e6e147e83e95c942135f54aeba7"
set_var CLOUDFLARE_API_TOKEN            "4qbyOx4dHUdx_rcQwEtgKEwoTeZVIGLeGWsQwprh"
set_var CLOUDFLARE_D1_DATABASE_ID       "50f5e26a-c794-4cfa-b2b7-2bbd1d7c045c"

# ── R2 Storage ───────────────────────────────────────────────
set_var R2_PUBLIC_URL                   "https://pub-92e8410d303d443cbff43b58f2b17878.r2.dev"
set_var NEXT_PUBLIC_R2_PUBLIC_URL       "https://pub-92e8410d303d443cbff43b58f2b17878.r2.dev"
set_var R2_WORKER_SECRET                "r2-secret-aiscern-2026"
set_var R2_UPLOAD_WORKER_URL            "https://detectai-r2-upload.admin.aiscern.com.workers.dev"

# ── AI / ML APIs ─────────────────────────────────────────────
set_var GEMINI_API_KEY                  "AIzaSyDCv-r8rfk18HI0qNb3WI_1tYAVFOPVImw"
set_var HUGGINGFACE_API_TOKEN           "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"
set_var NVIDIA_API_KEY                  "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"
set_var NVIDIA_API_KEY_2                "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"

# ── Upstash Redis ────────────────────────────────────────────
set_var UPSTASH_REDIS_REST_URL          "https://eager-robin-71735.upstash.io"
set_var UPSTASH_REDIS_REST_TOKEN        "gQAAAAAAARg3AAIncDJkZTEwOGI4ZmFmMjY0YTJlYjQ0NjkzZWVlOTkwMzcwM3AyNzE3MzU"
set_var REDIS_URL                       "rediss://default:gQAAAAAAARg3AAIncDJkZTEwOGI4ZmFmMjY0YTJlYjQ0NjkzZWVlOTkwMzcwM3AyNzE3MzU@eager-robin-71735.upstash.io:6379"

# ── QStash ───────────────────────────────────────────────────
set_var QSTASH_TOKEN                    "eyJVc2VySUQiOiI4YTdjMDQ5NC02Mjk1LTQ3MWItYWIwMS0yMjNiNmNjMjRjMmQiLCJQYXNzd29yZCI6ImEwODc3NzRhNDJmYzQ3NGM5NzcwMDJiZDEzYjFjM2NkIn0="
set_var QSTASH_CURRENT_SIGNING_KEY      "sig_5Pxoi4KQLUAoF4MszbdmsyjZtcC8"
set_var QSTASH_NEXT_SIGNING_KEY         "sig_5b5hpjKDq5nMowcV9BRvhUPzwnfF"

# ── Inngest ──────────────────────────────────────────────────
set_var INNGEST_EVENT_KEY               "JKXbLexSGI2eLDTKY3vIRbBlUwsjK8p_d61tAvUgaUSGcLpHizThyu6prDWR8URWiQtLZX5jkLT1A5jfVGCO9w"
set_var INNGEST_SIGNING_KEY             "signkey-prod-c50d1dc8ee0955a14e69cb642114a59b617fd81ea35bfb84a081bec08065444b"

# ── Resend (email) ───────────────────────────────────────────
set_var RESEND_API_KEY                  "re_YWEYVur6_Jusg62G8UpvQuwUkyRMMeZKy"

# ── App ──────────────────────────────────────────────────────
set_var NEXT_PUBLIC_APP_URL             "https://aiscern.com"
set_var INTERNAL_API_SECRET             "detectai-internal-2026"
set_var CF_PAGES                        "1"
set_var NEXT_TELEMETRY_DISABLED         "1"

echo ""
echo "✅ All environment variables set successfully!"
echo ""
echo "Next: Go to Cloudflare Pages dashboard → aiscern → Deployments → Retry latest deployment"
