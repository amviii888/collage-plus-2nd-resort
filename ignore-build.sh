#!/bin/bash

# ==============================================================================
# 🚀 SMART BUILD-IGNORE SCRIPT FOR CLOUDFLARE PAGES & VERCEL
# ==============================================================================
# This script gives you 100% control over when automatic builds are triggered.
# It prevents automatic builds on every commit to save your build minutes/quota.
#
# How to trigger a build automatically:
# Add "[build]" or "[deploy]" to your commit message (e.g., "git commit -m 'Added dashboard [build]'").
#
# How to configure in your hosting provider:
#
# 1. Cloudflare Pages:
#    - Go to: Project Settings -> Builds & deployments -> Build trigger
#    - Look for: "Ignored build step"
#    - Set the command to: bash ignore-build.sh
#
# 2. Vercel:
#    - Go to: Project Settings -> Git -> Ignored Build Step
#    - Set the command to: bash ignore-build.sh
# ==============================================================================

echo "🔍 Running Smart Build-Ignore Check..."

# Fetch commit message from environment variables
COMMIT_MSG=""

if [ ! -z "$CF_PAGES_COMMIT_MESSAGE" ]; then
  COMMIT_MSG="$CF_PAGES_COMMIT_MESSAGE"
  echo "📡 Detected Cloudflare Pages Environment"
elif [ ! -z "$VERCEL_GIT_COMMIT_MESSAGE" ]; then
  COMMIT_MSG="$VERCEL_GIT_COMMIT_MESSAGE"
  echo "📡 Detected Vercel Environment"
else
  # Fallback if running locally or in another CI
  COMMIT_MSG=$(git log -1 --pretty=%B 2>/dev/null)
  echo "📡 Running in local/fallback git environment"
fi

echo "💬 Latest Commit Message: \"$COMMIT_MSG\""

# Check if commit message contains [build] or [deploy]
if [[ "$COMMIT_MSG" =~ "\[build\]" || "$COMMIT_MSG" =~ "\[deploy\]" ]]; then
  echo "✅ Trigger keyword '[build]' or '[deploy]' detected! Proceeding with build..."
  exit 1 # Exit 1 tells Cloudflare/Vercel to RUN the build
else
  echo "🛑 No build keyword detected. Skipping build to save resources."
  exit 0 # Exit 0 tells Cloudflare/Vercel to SKIP the build
fi
