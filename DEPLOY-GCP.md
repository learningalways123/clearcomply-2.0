# Deploying Clear Comply to Google Cloud Run

This document covers the full deployment process. Steps 1–4 are **one-time setup** you only do
when first configuring the project. Steps 5–6 are what you run for every release.

---

## Prerequisites

Install these on your local machine before starting:

- [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install)
- Docker Desktop (running)
- A Google Cloud account with billing enabled

---

## Step 1 — GCP Project & CLI Setup

```bash
# Log in
gcloud auth login

# Create a new project (or skip if you already have one)
gcloud projects create clearcomply-prod --name="Clear Comply"

# Set it as your active project
gcloud config set project clearcomply-prod

# Enable all the APIs the deployment needs (one-time)
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  vpcaccess.googleapis.com
```

---

## Step 2 — Artifact Registry (Container Image Storage)

Cloud Run pulls images from Artifact Registry, not Docker Hub.

```bash
# Create a repository named "clearcomply" in us-central1
gcloud artifacts repositories create clearcomply \
  --repository-format=docker \
  --location=us-central1

# Authorize Docker to push/pull from it
gcloud auth configure-docker us-central1-docker.pkg.dev
```

Your image tags will now look like:
`us-central1-docker.pkg.dev/clearcomply-prod/clearcomply/backend:latest`

---

## Step 3 — Cloud SQL Database

The app requires a PostgreSQL database. Cloud SQL is the managed option on GCP.

```bash
# Create the instance (this takes 3-5 minutes)
gcloud sql instances create clearcomply-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1

# Create the database
gcloud sql databases create clearcomply --instance=clearcomply-db

# Create the app user with a strong password
gcloud sql users create clearcomply \
  --instance=clearcomply-db \
  --password=<CHOOSE_A_STRONG_PASSWORD>
```

After creation, get the **Instance Connection Name** — you'll need it for the backend deployment:

```bash
gcloud sql instances describe clearcomply-db --format="value(connectionName)"
# Output looks like: clearcomply-prod:us-central1:clearcomply-db
```

The app connects to Cloud SQL via a Unix socket (no VPC needed). The `DATABASE_URL` format is:
```
postgresql://clearcomply:<PASSWORD>@/clearcomply?host=/cloudsql/clearcomply-prod:us-central1:clearcomply-db
```

---

## Step 4 — Secret Manager (Sensitive Config)

Never put secrets in environment variables directly in Cloud Run — use Secret Manager.

```bash
# 1. JWT signing key (generate a random 32+ character string)
echo -n "$(openssl rand -hex 32)" | \
  gcloud secrets create jwt-secret --data-file=-

# 2. Full database connection URL
echo -n "postgresql://clearcomply:<PASSWORD>@/clearcomply?host=/cloudsql/clearcomply-prod:us-central1:clearcomply-db" | \
  gcloud secrets create database-url --data-file=-

# 3. Grant Cloud Run's default service account access to read these secrets
PROJECT_NUMBER=$(gcloud projects describe clearcomply-prod --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding jwt-secret \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Step 5 — Deploy the Backend

The `deploy-backend.sh` script handles this. Before running it, open the script and fill in
the `CONFIG` section at the top:

| Variable | Where to find it |
|---|---|
| `GCP_PROJECT` | Your GCP project ID (e.g. `clearcomply-prod`) |
| `GCP_REGION` | The region you used above (e.g. `us-central1`) |
| `CLOUD_SQL_INSTANCE` | Output of `gcloud sql instances describe ... --format="value(connectionName)"` |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials → your OAuth Client ID |
| `FRONTEND_URL` | Leave blank on first deploy; fill in after the frontend is deployed and re-run |

Then run:
```bash
chmod +x deploy-backend.sh
./deploy-backend.sh
```

At the end, the script prints the backend URL. **Copy it** — you need it for the frontend deploy.

---

## Step 6 — Deploy the Frontend

The frontend is a React/Vite app. The backend URL and Google Client ID are baked into the
JavaScript bundle at build time, so the backend must be deployed first.

Open `deploy-frontend.sh` and fill in the `CONFIG` section:

| Variable | Where to find it |
|---|---|
| `GCP_PROJECT` | Same as above |
| `GCP_REGION` | Same as above |
| `BACKEND_URL` | The URL printed at the end of Step 5 |
| `VITE_GOOGLE_CLIENT_ID` | Same Google OAuth Client ID as above |

Then run:
```bash
chmod +x deploy-frontend.sh
./deploy-frontend.sh
```

---

## Step 7 — Post-Deployment: Update Google OAuth

The Google OAuth flow only works if the frontend URL is registered with Google.

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click your OAuth 2.0 Client ID
3. Under **Authorized JavaScript origins**, add your frontend Cloud Run URL:
   `https://clearcomply-frontend-xxxx-uc.a.run.app`
4. Under **Authorized redirect URIs**, add the same URL
5. Click **Save**

---

## Step 8 — Post-Deployment: Update Backend CORS

Once the frontend URL is known, update the backend so it accepts requests from it:

```bash
gcloud run services update clearcomply-backend \
  --region=us-central1 \
  --update-env-vars "CORS_ORIGINS=https://clearcomply-frontend-xxxx-uc.a.run.app"
```

---

## Redeploying After Code Changes

After changing backend code:
```bash
./deploy-backend.sh
```

After changing frontend code (no backend changes):
```bash
./deploy-frontend.sh
```

If the backend URL ever changes (unlikely), you need to rebuild and redeploy the frontend too,
because the URL is baked into the JS bundle.

---

## Useful Commands

```bash
# Tail live logs from Cloud Run
gcloud run services logs tail clearcomply-backend --region=us-central1
gcloud run services logs tail clearcomply-frontend --region=us-central1

# List deployed services
gcloud run services list --region=us-central1

# Get the URL of a service
gcloud run services describe clearcomply-backend --region=us-central1 --format="value(status.url)"
```
