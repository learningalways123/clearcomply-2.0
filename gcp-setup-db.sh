#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# gcp-setup-db.sh — Create the free-tier GCE database VM and install Postgres
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GCP_PROJECT="start1-f4f45"
GCP_REGION="us-central1"
GCP_ZONE="us-central1-a"
VM_NAME="clearcomply-db-vm"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step()  { echo -e "\n${GREEN}▶ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠ $1${NC}"; }
error() { echo -e "${RED}✗ $1${NC}"; exit 1; }

# 1. Enable Compute Engine API
step "Enabling Compute Engine API..."
gcloud services enable compute.googleapis.com --project="$GCP_PROJECT"

# 2. Create Firewall Rule for Postgres if not exists
step "Configuring firewall rule allow-postgres..."
if ! gcloud compute firewall-rules describe allow-postgres --project="$GCP_PROJECT" >/dev/null 2>&1; then
  gcloud compute firewall-rules create allow-postgres \
    --project="$GCP_PROJECT" \
    --allow=tcp:5432 \
    --target-tags=postgres-server \
    --description="Allow Postgres access to GCE database instance"
  echo "✔ Firewall rule allow-postgres created."
else
  echo "✔ Firewall rule allow-postgres already exists."
fi

# 3. Write VM startup script to install Docker and Postgres
step "Preparing VM startup metadata..."
STARTUP_SCRIPT=$(cat << 'EOF'
#!/bin/bash
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker

# Run Postgres container with automatic restart on reboot
sudo docker run -d \
  --name clearcomply-postgres \
  --restart always \
  -p 5432:5432 \
  -e POSTGRES_DB=clearcomply \
  -e POSTGRES_USER=clearcomply \
  -e POSTGRES_PASSWORD=clearcomply_prod_pass \
  -v /var/lib/postgresql/data:/var/lib/postgresql/data \
  postgres:16
EOF
)

# 4. Create the GCE VM (e2-micro 30GB is free-tier eligible)
step "Creating Compute Engine VM: $VM_NAME..."
if ! gcloud compute instances describe "$VM_NAME" --project="$GCP_PROJECT" --zone="$GCP_ZONE" >/dev/null 2>&1; then
  gcloud compute instances create "$VM_NAME" \
    --project="$GCP_PROJECT" \
    --zone="$GCP_ZONE" \
    --machine-type=e2-micro \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --boot-disk-size=30GB \
    --boot-disk-type=pd-standard \
    --tags=postgres-server \
    --metadata=startup-script="$STARTUP_SCRIPT"
  echo "✔ VM $VM_NAME created successfully."
else
  warn "VM $VM_NAME already exists."
fi

# 5. Wait for VM IP
step "Waiting for VM public IP address..."
sleep 10
VM_IP=$(gcloud compute instances describe "$VM_NAME" \
  --project="$GCP_PROJECT" \
  --zone="$GCP_ZONE" \
  --format="value(networkInterfaces[0].accessConfigs[0].natIP)" || echo "")

if [[ -n "$VM_IP" ]]; then
  echo -e "${GREEN}✔ VM IP: $VM_IP${NC}"
  echo "Database connection string: postgresql://clearcomply:clearcomply_prod_pass@$VM_IP:5432/clearcomply"
  echo ""
  echo "You can now run ./gcp-start.sh to start the services or ./gcp-deploy.sh to redeploy."
else
  warn "Could not retrieve VM IP address immediately. Please check VM state in Google Cloud Console."
fi
