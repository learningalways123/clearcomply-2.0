#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# gcp-start.sh — Start GCE database VM, update DB secrets, and run Cloud Run
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

# 1. Start GCE VM
step "Starting Compute Engine database VM ($VM_NAME)..."
gcloud compute instances start "$VM_NAME" --project="$GCP_PROJECT" --zone="$GCP_ZONE"

# 2. Get VM Public IP
step "Retrieving VM public IP..."
VM_IP=""
for i in {1..12}; do
  VM_IP=$(gcloud compute instances describe "$VM_NAME" \
    --project="$GCP_PROJECT" \
    --zone="$GCP_ZONE" \
    --format="value(networkInterfaces[0].accessConfigs[0].natIP)" || echo "")
  if [[ -n "$VM_IP" ]]; then
    break
  fi
  echo "  Waiting for IP allocation..."
  sleep 5
done

if [[ -z "$VM_IP" ]]; then
  error "Could not retrieve VM public IP address."
fi

echo "✔ VM IP: $VM_IP"

# 3. Update Database Secret
step "Updating Secret Manager database-url secret..."
CONN_STR="postgresql://clearcomply:clearcomply_prod_pass@$VM_IP:5432/clearcomply"
echo -n "$CONN_STR" | gcloud secrets versions add database-url --data-file=- --project="$GCP_PROJECT"

# 4. Trigger Cloud Run revision updates to pull latest secret version
step "Updating Cloud Run backend to fetch latest secret..."
gcloud run services update "$BACKEND_SERVICE" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT" \
  --max-instances=10 \
  --quiet

step "Waking up Cloud Run frontend..."
gcloud run services update "$FRONTEND_SERVICE" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT" \
  --max-instances=5 \
  --quiet

# 5. Display Portal Details
FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT" \
  --format "value(status.url)")

echo ""
echo -e "${GREEN}✔ Clear Comply is now UP and running!${NC}"
echo "----------------------------------------------------"
echo "  Frontend Portal: $FRONTEND_URL"
echo "  Backend API   : \$(gcloud run services describe "$BACKEND_SERVICE" --region="$GCP_REGION" --project="$GCP_PROJECT" --format 'value(status.url)')"
echo "  Database Host  : $VM_IP (port 5432)"
echo "----------------------------------------------------"
echo "To shut down the services and avoid charges, run ./gcp-stop.sh"
EOF
