#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-frontend.sh — Build, push, and deploy the Clear Comply frontend to
#                      Google Cloud Run.
#
# Usage: ./deploy-frontend.sh
#
# IMPORTANT: Deploy the backend first (./deploy-backend.sh) and copy the
# backend URL into BACKEND_URL below. The URL is baked into the JS bundle
# at build time and cannot be changed without rebuilding.
#
# Fill in the CONFIG section below before running. See DEPLOY-GCP.md for
# instructions on finding each value.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── CONFIG — fill these in ───────────────────────────────────────────────────

GCP_PROJECT="clearcomply-prod"           # Your GCP project ID
GCP_REGION="us-central1"                 # Region for Cloud Run and Artifact Registry
ARTIFACT_REPO="clearcomply"              # Artifact Registry repository name
SERVICE_NAME="clearcomply-frontend"      # Cloud Run service name

# Backend Cloud Run URL from deploy-backend.sh output
# Example: https://clearcomply-backend-xxxx-uc.a.run.app
BACKEND_URL="https://clearcomply-backend-xxxx-uc.a.run.app"

# Google OAuth Client ID — must match what is in the backend config
VITE_GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"

# ─────────────────────────────────────────────────────────────────────────────

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step()  { echo -e "\n${GREEN}▶ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠ $1${NC}"; }
error() { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ── Preflight checks ──────────────────────────────────────────────────────────

step "Checking prerequisites..."

command -v gcloud >/dev/null 2>&1 || error "gcloud CLI not found. Install it from https://cloud.google.com/sdk/docs/install"
command -v docker  >/dev/null 2>&1 || error "Docker not found or not running."

docker info >/dev/null 2>&1 || error "Docker daemon is not running. Start Docker Desktop and retry."

if [[ "$BACKEND_URL" == "https://clearcomply-backend-xxxx-uc.a.run.app" ]]; then
  error "BACKEND_URL is still the placeholder. Run ./deploy-backend.sh first and paste the output URL here."
fi

if [[ "$VITE_GOOGLE_CLIENT_ID" == "your-client-id.apps.googleusercontent.com" ]]; then
  error "VITE_GOOGLE_CLIENT_ID is still the placeholder value. Edit the CONFIG section at the top of this script."
fi

ACTIVE_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [[ "$ACTIVE_PROJECT" != "$GCP_PROJECT" ]]; then
  warn "Active gcloud project is '$ACTIVE_PROJECT', expected '$GCP_PROJECT'."
  echo "  Switching project to $GCP_PROJECT..."
  gcloud config set project "$GCP_PROJECT"
fi

# ── Derive values ─────────────────────────────────────────────────────────────

IMAGE_BASE="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/$ARTIFACT_REPO/frontend"
IMAGE_TAG="${IMAGE_BASE}:$(date +%Y%m%d-%H%M%S)"
IMAGE_LATEST="${IMAGE_BASE}:latest"

# VITE_API_BASE_URL: the JS bundle calls the backend at this URL.
# The /api prefix is appended by api.ts if not already present — pass the root URL.
VITE_API_BASE_URL="$BACKEND_URL"

# ── Build ─────────────────────────────────────────────────────────────────────

step "Building frontend Docker image..."
echo "  Image         : $IMAGE_TAG"
echo "  VITE_API_BASE : $VITE_API_BASE_URL"
echo "  Google Client : $VITE_GOOGLE_CLIENT_ID"
echo ""
echo "  NOTE: These values are compiled into the JS bundle. To change them you"
echo "  must rebuild and redeploy the frontend."

docker build \
  --platform linux/amd64 \
  --build-arg "VITE_API_BASE_URL=${VITE_API_BASE_URL}" \
  --build-arg "VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}" \
  -t "$IMAGE_TAG" \
  -t "$IMAGE_LATEST" \
  ./UI

# ── Push ──────────────────────────────────────────────────────────────────────

step "Pushing image to Artifact Registry..."

gcloud auth configure-docker "$GCP_REGION-docker.pkg.dev" --quiet

docker push "$IMAGE_TAG"
docker push "$IMAGE_LATEST"

# ── Deploy to Cloud Run ───────────────────────────────────────────────────────

step "Deploying to Cloud Run..."

gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_TAG" \
  --region "$GCP_REGION" \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 5 \
  --memory 256Mi \
  --cpu 1 \
  --port 8080 \
  --set-env-vars "BACKEND_URL=${BACKEND_URL}" \
  --quiet

# ── Done ──────────────────────────────────────────────────────────────────────

FRONTEND_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$GCP_REGION" \
  --format "value(status.url)")

echo ""
echo -e "${GREEN}✔ Frontend deployed successfully!${NC}"
echo ""
echo "  Service URL: $FRONTEND_URL"
echo ""
echo "  ─── Next steps ────────────────────────────────────────────────────────"
echo ""
echo "  1. Update CORS on the backend so it accepts requests from the frontend:"
echo ""
echo "     gcloud run services update clearcomply-backend \\"
echo "       --region=$GCP_REGION \\"
echo "       --update-env-vars CORS_ORIGINS=${FRONTEND_URL}"
echo ""
echo "  2. Register the frontend URL with Google OAuth:"
echo "     https://console.cloud.google.com/apis/credentials"
echo "     → Edit your OAuth Client ID"
echo "     → Add to Authorized JavaScript origins: $FRONTEND_URL"
echo "     → Add to Authorized redirect URIs:      $FRONTEND_URL"
echo ""
echo "  3. Paste the frontend URL back into deploy-backend.sh as FRONTEND_URL"
echo "     and re-run ./deploy-backend.sh to bake the CORS update in permanently."
