#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-quick.sh — One-shot deploy of backend + frontend to Cloud Run.
#
# Uses SQLite as the database so NO Cloud SQL, Secret Manager, or VPC setup
# is required. Perfect for a first deploy or demo.
#
# ⚠  SQLite on Cloud Run is EPHEMERAL — data is lost when the container
#    restarts. This is intentional for a quick deploy. When you are ready for
#    persistent data, follow the full DEPLOY-GCP.md guide and switch to
#    Cloud SQL + the existing deploy-backend.sh / deploy-frontend.sh scripts.
#
# Prerequisites (one-time, takes ~2 min):
#   1. Install gcloud CLI  →  https://cloud.google.com/sdk/docs/install
#   2. Run:  gcloud auth login
#   3. Docker Desktop must be running
#   4. Fill in the CONFIG section below
#
# Usage:
#   chmod +x deploy-quick.sh
#   ./deploy-quick.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── CONFIG — fill these in before running ────────────────────────────────────

# Your GCP project ID.  Create one at https://console.cloud.google.com if needed.
# Must be globally unique, e.g. "clearcomply-demo-2024"
GCP_PROJECT="clearcomply-prod"

# Cloud region — us-central1 is a good default
GCP_REGION="us-central1"

# Artifact Registry repo name (will be created automatically if it doesn't exist)
ARTIFACT_REPO="clearcomply"

# Google OAuth Client ID — find it at:
#   https://console.cloud.google.com/apis/credentials
# It looks like:  123456789-xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"

# ─────────────────────────────────────────────────────────────────────────────
# Everything below is automatic — no edits needed.
# ─────────────────────────────────────────────────────────────────────────────

BACKEND_SERVICE="clearcomply-backend"
FRONTEND_SERVICE="clearcomply-frontend"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

step()    { echo -e "\n${GREEN}▶ $*${NC}"; }
info()    { echo -e "  ${CYAN}$*${NC}"; }
warn()    { echo -e "${YELLOW}⚠  $*${NC}"; }
error()   { echo -e "${RED}✗  $*${NC}"; exit 1; }
success() { echo -e "${GREEN}${BOLD}✔  $*${NC}"; }

# ── Preflight checks ──────────────────────────────────────────────────────────

step "Checking prerequisites..."

command -v gcloud >/dev/null 2>&1 || \
  error "gcloud CLI not found. Install it from https://cloud.google.com/sdk/docs/install"

command -v docker >/dev/null 2>&1 || \
  error "Docker not found."

docker info >/dev/null 2>&1 || \
  error "Docker daemon is not running. Start Docker Desktop and retry."

if [[ "$GOOGLE_CLIENT_ID" == "your-client-id.apps.googleusercontent.com" ]]; then
  error "GOOGLE_CLIENT_ID is still the placeholder. Edit the CONFIG section at the top of this script."
fi

info "All prerequisites met."

# ── GCP project ───────────────────────────────────────────────────────────────

step "Configuring GCP project..."

ACTIVE_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [[ "$ACTIVE_PROJECT" != "$GCP_PROJECT" ]]; then
  warn "Active project is '$ACTIVE_PROJECT' — switching to '$GCP_PROJECT'."
  gcloud config set project "$GCP_PROJECT"
fi

# ── Enable required APIs (only the ones we actually need) ─────────────────────

step "Enabling required GCP APIs..."
info "This may take a minute on first run..."

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com

info "APIs enabled."

# ── Artifact Registry ─────────────────────────────────────────────────────────

step "Setting up Artifact Registry..."

if ! gcloud artifacts repositories describe "$ARTIFACT_REPO" \
    --location="$GCP_REGION" --quiet >/dev/null 2>&1; then
  info "Creating repository '$ARTIFACT_REPO' in $GCP_REGION..."
  gcloud artifacts repositories create "$ARTIFACT_REPO" \
    --repository-format=docker \
    --location="$GCP_REGION" \
    --description="Clear Comply container images" \
    --quiet
  info "Repository created."
else
  info "Repository '$ARTIFACT_REPO' already exists."
fi

gcloud auth configure-docker "$GCP_REGION-docker.pkg.dev" --quiet

# ── Generate a JWT signing key ────────────────────────────────────────────────
# We generate a random 32-byte hex key at deploy time and pass it as an env var.
# Note: this key is visible in Cloud Run's environment variable console.
# For a production deploy, move this to Secret Manager (see DEPLOY-GCP.md).

JWT_SECRET_KEY=$(openssl rand -hex 32)
info "JWT signing key generated."

# ── Common image base path ────────────────────────────────────────────────────

IMAGE_BASE="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/$ARTIFACT_REPO"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# ═════════════════════════════════════════════════════════════════════════════
# BACKEND
# ═════════════════════════════════════════════════════════════════════════════

BACKEND_IMAGE="${IMAGE_BASE}/backend:${TIMESTAMP}"
BACKEND_IMAGE_LATEST="${IMAGE_BASE}/backend:latest"

# CORS — allow localhost for testing; we'll add the frontend URL after deploy
CORS_ORIGINS="http://localhost:3000,http://localhost:5173"

step "Building backend Docker image..."
info "Image: $BACKEND_IMAGE"
echo ""

docker build \
  --platform linux/amd64 \
  -t "$BACKEND_IMAGE" \
  -t "$BACKEND_IMAGE_LATEST" \
  ./Service

step "Pushing backend image..."

docker push "$BACKEND_IMAGE"
docker push "$BACKEND_IMAGE_LATEST"

step "Deploying backend to Cloud Run (SQLite mode — no Cloud SQL required)..."

gcloud run deploy "$BACKEND_SERVICE" \
  --image "$BACKEND_IMAGE" \
  --region "$GCP_REGION" \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 1 \
  --max-instances 5 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60 \
  --set-env-vars "CORS_ORIGINS=${CORS_ORIGINS},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},JWT_SECRET_KEY=${JWT_SECRET_KEY}" \
  --quiet

BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
  --region "$GCP_REGION" \
  --format "value(status.url)")

success "Backend deployed: $BACKEND_URL"

# ═════════════════════════════════════════════════════════════════════════════
# FRONTEND
# ═════════════════════════════════════════════════════════════════════════════

FRONTEND_IMAGE="${IMAGE_BASE}/frontend:${TIMESTAMP}"
FRONTEND_IMAGE_LATEST="${IMAGE_BASE}/frontend:latest"

# VITE_API_BASE_URL is baked into the JS bundle at build time — must point to the
# deployed backend URL.
VITE_API_BASE_URL="$BACKEND_URL"

step "Building frontend Docker image..."
info "Image         : $FRONTEND_IMAGE"
info "Backend URL   : $VITE_API_BASE_URL"
info "Google Client : $GOOGLE_CLIENT_ID"
echo ""
info "NOTE: Backend URL and Google Client ID are compiled into the JS bundle."
info "To change them you must rebuild and redeploy the frontend."
echo ""

docker build \
  --platform linux/amd64 \
  --build-arg "VITE_API_BASE_URL=${VITE_API_BASE_URL}" \
  --build-arg "VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" \
  -t "$FRONTEND_IMAGE" \
  -t "$FRONTEND_IMAGE_LATEST" \
  ./UI

step "Pushing frontend image..."

docker push "$FRONTEND_IMAGE"
docker push "$FRONTEND_IMAGE_LATEST"

step "Deploying frontend to Cloud Run..."

gcloud run deploy "$FRONTEND_SERVICE" \
  --image "$FRONTEND_IMAGE" \
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

FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
  --region "$GCP_REGION" \
  --format "value(status.url)")

success "Frontend deployed: $FRONTEND_URL"

# ── Update backend CORS to accept the frontend URL ────────────────────────────

step "Updating backend CORS to accept the frontend URL..."

CORS_ORIGINS_UPDATED="http://localhost:3000,http://localhost:5173,${FRONTEND_URL}"

gcloud run services update "$BACKEND_SERVICE" \
  --region "$GCP_REGION" \
  --update-env-vars "CORS_ORIGINS=${CORS_ORIGINS_UPDATED}" \
  --quiet

info "CORS updated: $CORS_ORIGINS_UPDATED"

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Clear Comply deployed successfully!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Frontend:${NC} $FRONTEND_URL"
echo -e "  ${BOLD}Backend: ${NC} $BACKEND_URL"
echo -e "  ${BOLD}Health:  ${NC} $BACKEND_URL/health"
echo ""
echo -e "${YELLOW}${BOLD}  ⚠  Database note:${NC}"
echo "  The backend is running with SQLite — data will be lost if the container"
echo "  restarts. This is intentional for a quick deploy. See DEPLOY-GCP.md"
echo "  for instructions on upgrading to Cloud SQL for persistent storage."
echo ""
echo -e "${BOLD}  Required: Register the frontend URL with Google OAuth${NC}"
echo ""
echo "  1. Go to https://console.cloud.google.com/apis/credentials"
echo "  2. Click your OAuth 2.0 Client ID"
echo "  3. Under Authorized JavaScript origins, add:"
echo "       $FRONTEND_URL"
echo "  4. Under Authorized redirect URIs, add the same URL"
echo "  5. Click Save"
echo ""
echo "  Without this step, Google login will be blocked by OAuth."
echo ""
