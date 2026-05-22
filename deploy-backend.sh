#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-backend.sh — Build, push, and deploy the Clear Comply backend to
#                     Google Cloud Run.
#
# Usage: ./deploy-backend.sh
#
# Fill in the CONFIG section below before running. See DEPLOY-GCP.md for
# instructions on finding each value.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── CONFIG — fill these in ───────────────────────────────────────────────────

GCP_PROJECT="clearcomply-prod"           # Your GCP project ID
GCP_REGION="us-central1"                 # Region for Cloud Run and Artifact Registry
ARTIFACT_REPO="clearcomply"              # Artifact Registry repository name
SERVICE_NAME="clearcomply-backend"       # Cloud Run service name

# Cloud SQL instance connection name (PROJECT:REGION:INSTANCE)
# Get it with: gcloud sql instances describe clearcomply-db --format="value(connectionName)"
CLOUD_SQL_INSTANCE="clearcomply-prod:us-central1:clearcomply-db"

# Google OAuth Client ID (not a secret — safe as an env var)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"

# Frontend Cloud Run URL — used for CORS. Set this after the frontend is deployed.
# Leave as empty string on first deploy; update and re-run once the frontend URL is known.
FRONTEND_URL=""

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

if [[ "$GOOGLE_CLIENT_ID" == "your-client-id.apps.googleusercontent.com" ]]; then
  error "GOOGLE_CLIENT_ID is still the placeholder value. Edit the CONFIG section at the top of this script."
fi

ACTIVE_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [[ "$ACTIVE_PROJECT" != "$GCP_PROJECT" ]]; then
  warn "Active gcloud project is '$ACTIVE_PROJECT', expected '$GCP_PROJECT'."
  echo "  Switching project to $GCP_PROJECT..."
  gcloud config set project "$GCP_PROJECT"
fi

# ── Derive values ─────────────────────────────────────────────────────────────

IMAGE_BASE="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/$ARTIFACT_REPO/backend"
IMAGE_TAG="${IMAGE_BASE}:$(date +%Y%m%d-%H%M%S)"
IMAGE_LATEST="${IMAGE_BASE}:latest"

# Build CORS_ORIGINS — always allow localhost for testing; add frontend URL if set
CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
if [[ -n "$FRONTEND_URL" ]]; then
  CORS_ORIGINS="${CORS_ORIGINS},${FRONTEND_URL}"
fi

# ── Build ─────────────────────────────────────────────────────────────────────

step "Building backend Docker image..."
echo "  Image: $IMAGE_TAG"

docker build \
  --platform linux/amd64 \
  -t "$IMAGE_TAG" \
  -t "$IMAGE_LATEST" \
  ./Service

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
  --min-instances 1 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60 \
  --add-cloudsql-instances "$CLOUD_SQL_INSTANCE" \
  --set-env-vars "CORS_ORIGINS=${CORS_ORIGINS},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" \
  --set-secrets "JWT_SECRET_KEY=jwt-secret:latest,DATABASE_URL=database-url:latest" \
  --quiet

# ── Done ──────────────────────────────────────────────────────────────────────

BACKEND_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$GCP_REGION" \
  --format "value(status.url)")

echo ""
echo -e "${GREEN}✔ Backend deployed successfully!${NC}"
echo ""
echo "  Service URL : $BACKEND_URL"
echo "  Health check: $BACKEND_URL/health"
echo ""
echo "  Next step: copy the URL above, paste it into deploy-frontend.sh as BACKEND_URL,"
echo "  then run ./deploy-frontend.sh"

if [[ -z "$FRONTEND_URL" ]]; then
  warn "FRONTEND_URL is not set. Once the frontend is deployed, add its URL to the"
  warn "FRONTEND_URL variable in this script and re-run to update CORS."
fi
