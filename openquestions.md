# Open Questions for Clear Comply

This document lists the open architectural, design, and deployment questions remaining for the Clear Comply application as it moves towards production-readiness.

---

## 1. Cloud SQL Migration & Database Configurations
*   **Networking & Connectivity**: When migrating from the local Docker-based PostgreSQL (port 5433) to GCP Cloud SQL, will the connection be established over public IP with SSL, via a Cloud SQL Auth Proxy, or through a serverless VPC connector using private IP?
*   **Credential Management**: How should database credentials be injected in production (e.g., GCP Secret Manager, environment variables)?

## 2. Framework Expansion & Missing Question Banks
*   **Question Banks**: Which security frameworks and versions should be prioritized next? (NIST 800-53 is partially loaded with 50 seeded questions, while NIST CSF 2.0 has 493).
*   **Custom Frameworks**: Will organizations need the ability to upload their own spreadsheet-based custom frameworks, or will we strictly seed standards from official mappings?

## 3. Production Authentication & Google OAuth
*   **OAuth Scopes & Domain Verification**: For production Google OAuth deployment, what domains and redirect URIs must be configured?
*   **Local User Fallback**: Should the local username/password auth flow be kept for assessors who don't use Google Workspace accounts, or will Google OAuth / SAML SSO be mandatory?

## 4. SMTP / Email Reminder Integration
*   **Service Provider**: The "Remind all overdue" intake team feature needs a real-world mail client. Which email service provider (e.g. SendGrid, AWS SES, or SMTP relay) should be configured for the backend?
*   **Notification Frequency**: Should team reminders be triggered manually (as currently designed with confirmation modals), or should we implement cron-based automated daily/weekly sweeps?

## 5. Storage for Scanned Diagrams & Evidence
*   **Object Storage Integration**: Data flow diagrams and uploaded evidence files are currently stored locally in `./uploads/`. For production deployment, should we integrate Google Cloud Storage (GCS) or AWS S3 to ensure persistence and high availability?
*   **MIME/Extension Constraints**: Should we implement stricter file type/malware scanning on diagram and evidence uploads beyond basic image and PDF checks?

## 6. Multi-Tenancy Scoping
*   **Data Scoping**: The application was simplified to a single-organization model during Phase 1. Will we need to re-introduce database-level multi-tenant isolation (scoped query helpers) to support multiple independent corporate organizations on the same backend instance?
