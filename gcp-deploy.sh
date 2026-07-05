#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# gcp-deploy.sh — Build, push, and deploy Clear Comply backend and frontend to GCP
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GCP_PROJECT="start1-f4f45"
GCP_REGION="us-central1"
GCP_ZONE="us-central1-a"
ARTIFACT_REPO="clearcomply"
BACKEND_SERVICE="clearcomply-backend"
FRONTEND_SERVICE="clearcomply-frontend"

# Update with your OAuth client ID
GOOGLE_CLIENT_ID="440433810610-d83i1m8a1gupb51egb9a2cgl6n9c2mvs.apps.googleusercontent.com"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step()  { echo -e "\n${GREEN}▶ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠ $1${NC}"; }
error() { echo -e "${RED}✗ $1${NC}"; exit 1; }

# 1. Setup GCE Database if not running
step "Ensuring GCE database VM is running..."
./gcp-setup-db.sh

# Get VM IP
VM_IP=$(gcloud compute instances describe "clearcomply-db-vm" \
  --project="$GCP_PROJECT" \
  --zone="$GCP_ZONE" \
  --format="value(networkInterfaces[0].accessConfigs[0].natIP)")

if [[ -z "$VM_IP" ]]; then
  error "Could not get database VM IP address."
fi

# Update Database Secret
step "Updating database-url secret..."
CONN_STR="postgresql://clearcomply:clearcomply_prod_pass@$VM_IP:5432/clearcomply"
echo -n "$CONN_STR" | gcloud secrets versions add database-url --data-file=- --project="$GCP_PROJECT"

# 2. Authenticate Docker
step "Configuring docker authorization..."
gcloud auth configure-docker "$GCP_REGION-docker.pkg.dev" --quiet

# Create repository if not exists
if ! gcloud artifacts repositories describe "$ARTIFACT_REPO" --location="$GCP_REGION" --project="$GCP_PROJECT" >/dev/null 2>&1; then
  step "Creating Artifact Registry repository..."
  gcloud artifacts repositories create "$ARTIFACT_REPO" \
    --repository-format=docker \
    --location="$GCP_REGION" \
    --project="$GCP_PROJECT"
fi

# 3. Build & Deploy Backend
step "Building backend Docker image..."
IMAGE_BACKEND="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/$ARTIFACT_REPO/backend:latest"
docker build --platform linux/amd64 -t "$IMAGE_BACKEND" ./Service

step "Pushing backend image to Artifact Registry..."
docker push "$IMAGE_BACKEND"

step "Deploying Backend to Cloud Run..."
gcloud run deploy "$BACKEND_SERVICE" \
  --image "$IMAGE_BACKEND" \
  --region "$GCP_REGION" \
  --project "$GCP_PROJECT" \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60 \
  --set-env-vars "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" \
  --set-secrets "JWT_SECRET_KEY=jwt-secret:latest,DATABASE_URL=database-url:latest" \
  --quiet

BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
  --region "$GCP_REGION" \
  --project "$GCP_PROJECT" \
  --format "value(status.url)")

# 4. Build & Deploy Frontend
step "Building frontend Docker image..."
IMAGE_FRONTEND="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/$ARTIFACT_REPO/frontend:latest"
docker build \
  --platform linux/amd64 \
  --build-arg "VITE_API_BASE_URL=${BACKEND_URL}" \
  --build-arg "VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" \
  -t "$IMAGE_FRONTEND" \
  ./UI

step "Pushing frontend image to Artifact Registry..."
docker push "$IMAGE_FRONTEND"

step "Deploying Frontend to Cloud Run..."
gcloud run deploy "$FRONTEND_SERVICE" \
  --image "$IMAGE_FRONTEND" \
  --region "$GCP_REGION" \
  --project "$GCP_PROJECT" \
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
  --project "$GCP_PROJECT" \
  --format "value(status.url)")

# 5. Wire CORS origins
step "Configuring CORS access on backend..."
gcloud run services update "$BACKEND_SERVICE" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT" \
  --update-env-vars "^;^CORS_ORIGINS=http://localhost:3000,http://localhost:5173,${FRONTEND_URL}" \
  --quiet

echo ""
echo -e "${GREEN}✔ Deployment complete!${NC}"
echo "----------------------------------------------------"
echo "  Frontend Portal: $FRONTEND_URL"
echo "  Backend API   : $BACKEND_URL"
echo "  Database Host  : $VM_IP"
echo "----------------------------------------------------"
echo ""
echo "Authorized redirect URIs for Google OAuth:"
echo "  - $FRONTEND_URL"
echo ""
echo "To pause all services at any time, run ./gcp-stop.sh"
