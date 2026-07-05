#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# gcp-stop.sh — Stop GCE database VM and suspend Cloud Run instances
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GCP_PROJECT="start1-f4f45"
GCP_REGION="us-central1"
GCP_ZONE="us-central1-a"
VM_NAME="clearcomply-db-vm"
BACKEND_SERVICE="clearcomply-backend"
FRONTEND_SERVICE="clearcomply-frontend"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step()  { echo -e "\n${GREEN}▶ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠ $1${NC}"; }
error() { echo -e "${RED}✗ $1${NC}"; exit 1; }

# 1. Suspend Cloud Run Services
step "Suspending Cloud Run backend (scaling max-instances to 0)..."
gcloud run services update "$BACKEND_SERVICE" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT" \
  --max-instances=0 \
  --quiet

step "Suspending Cloud Run frontend (scaling max-instances to 0)..."
gcloud run services update "$FRONTEND_SERVICE" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT" \
  --max-instances=0 \
  --quiet

# 2. Stop GCE VM
step "Stopping GCE database VM ($VM_NAME)..."
gcloud compute instances stop "$VM_NAME" \
  --project="$GCP_PROJECT" \
  --zone="$GCP_ZONE" \
  --quiet

echo ""
echo -e "${GREEN}✔ All Clear Comply services successfully stopped and suspended!${NC}"
echo "Your GCP environment is now in a 100% free/suspended state. Run ./gcp-start.sh to resume."
EOF
