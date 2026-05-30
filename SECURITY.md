# Clear Comply — Security Documentation

## Access Control

### Who Can Log In

Access is restricted to an explicit email allow-list enforced on the backend.
Only the following Google accounts are permitted to authenticate:

| User | Account |
|------|---------|
| Primary admin | `ashraful.alam@gmail.com` |
| Secondary user | `tafheem88@gmail.com` |

Any other Google account receives **HTTP 403 Forbidden** and cannot create an account,
log in via Google OAuth, or register with email/password.

### How the Allow-List Works

The allow-list is stored in the `ALLOWED_EMAILS` Cloud Run environment variable
(comma-separated). It is enforced in `Service/app/auth.py`:

```python
ALLOWED_EMAILS: set = {
    e.strip().lower() for e in os.getenv("ALLOWED_EMAILS", "").split(",") if e.strip()
}

def is_email_allowed(email: str) -> bool:
    if not ALLOWED_EMAILS:
        return True   # dev mode — no list configured
    return email.strip().lower() in ALLOWED_EMAILS
```

`is_email_allowed()` is called at every entry point:

| Entry point | File | Effect on blocked email |
|-------------|------|------------------------|
| Google OAuth login | `auth_routes.py` `/api/auth/google/login` | 403 |
| Email/password register | `auth_routes.py` `/api/auth/register` | 403 |
| Email/password login | `auth_routes.py` `/api/auth/login` | 403 |
| MFA verify (TOTP completion) | `auth_routes.py` `/api/auth/mfa/verify` | 403 |

### Updating the Allow-List

To add or remove a user, update the env var on the live service — no rebuild required:

```bash
gcloud run services update clearcomply-backend \
  --region us-central1 \
  --update-env-vars "^|^ALLOWED_EMAILS=user1@gmail.com,user2@gmail.com"
```

Update `deploy-quick.sh` (`ALLOWED_EMAILS=` line) at the same time so the list
persists across future full redeployments.

---

## Authentication Architecture

All API data endpoints require a valid **JWT bearer token** issued by this backend.
Tokens are obtained by authenticating via:

1. **Google OAuth** — user signs in with Google; the backend verifies the ID token
   with Google's public keys (`google.oauth2.id_token.verify_oauth2_token`), checks
   the allow-list, then issues a signed JWT.
2. **Email/password + optional TOTP/MFA** — password hashed with bcrypt
   (`passlib[bcrypt]`); TOTP via `pyotp`.

JWT tokens are signed with a randomly-generated 64-character key (`JWT_SECRET_KEY`)
created at deploy time and stored only in the Cloud Run environment. The key is never
committed to source code.

At startup, if `JWT_SECRET_KEY` is not set (or is the known placeholder), a critical
warning is emitted so the misconfiguration is visible in Cloud Run logs.

---

## Route Protection

### Protected endpoints (require valid JWT)

All application data routes require `Depends(get_current_user)`:

| Route | Method(s) |
|-------|-----------|
| `/api/assessments` | GET, POST |
| `/api/assessments/{id}` | GET, PATCH |
| `/api/assessments/{id}/answers` | POST |
| `/api/assessments/{id}/history` | GET |
| `/api/assessments/{id}/risk-score` | GET |
| `/api/assessments/{id}/reports/*` | GET |
| `/api/assessments/{id}/poam/auto-generate` | POST |
| `/api/assessments/{id}/poam/export` | GET |
| `/api/poam` | GET, POST |
| `/api/poam/{id}` | PATCH, DELETE |
| `/api/audit-log` | GET |
| `/api/dashboard` | GET |

### Intentionally public endpoints

| Route | Reason |
|-------|--------|
| `/health` | Cloud Run health check probe |
| `/api/frameworks` | Read-only reference data, no PII |
| `/api/controls` | Read-only reference data, no PII |
| `/api/questions` | Read-only reference data, no PII |
| `/api/families` | Read-only reference data, no PII |
| `/api/auth/*` | Login/register flows (allow-list enforced inside) |

---

## API Documentation Lockdown

Interactive API docs and the OpenAPI schema are disabled in production:

```python
_DOCS_ENABLED = os.getenv("ENABLE_API_DOCS", "false").lower() == "true"

app = FastAPI(
    docs_url   = "/api/docs"     if _DOCS_ENABLED else None,
    redoc_url  = "/api/redoc"    if _DOCS_ENABLED else None,
    openapi_url= "/openapi.json" if _DOCS_ENABLED else None,
)
```

All three return **HTTP 404** in production. Set `ENABLE_API_DOCS=true` in a local
`.env` to re-enable during development.

---

## Security Headers

Every HTTP response includes the following headers (added by middleware in `main.py`):

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; ...` |

---

## Rate Limiting

API requests are rate-limited to **100 requests per minute per IP** using `slowapi`.
Exceeding the limit returns HTTP 429.

---

## CORS Policy

The backend only accepts cross-origin requests from explicitly listed origins
(set via the `CORS_ORIGINS` env var at deploy time):

```
http://localhost:3000
http://localhost:5173
https://clearcomply-frontend-zuaomuy57q-uc.a.run.app
```

---

## Secrets — What Is and Is Not in GitHub

| Item | In GitHub? | Where it lives |
|------|-----------|----------------|
| `JWT_SECRET_KEY` | ❌ No | Cloud Run env var only — generated at each `deploy-quick.sh` run |
| `GOOGLE_CLIENT_ID` | ✅ Yes — not a secret | OAuth Client ID is public by design |
| `client_secret_*.json` | ❌ No | Excluded by `.gitignore` (`client_secret_*.json`) |
| `.env` files | ❌ No | Excluded by `.gitignore` |
| `ALLOWED_EMAILS` | ✅ Yes (deploy-quick.sh) | Email addresses only — not a credential |
| Database credentials | N/A | SQLite in container; no password needed |

The `.gitignore` patterns that prevent credential leaks:

```gitignore
.env
.env.local
.env.production
client_secret_*.json
*.db
*.sqlite3
```

---

## MFA Security

MFA (TOTP via `pyotp`) is opt-in per user. When enabled:

- Disabling MFA requires supplying a valid TOTP code — a stolen JWT alone is not
  sufficient. This prevents an attacker who captures a token from silently removing 2FA.
- The TOTP secret is stored in the database and cleared when MFA is disabled.

---

## Error Handling

All unhandled exceptions are caught at two layers:

1. **Route-level `except` blocks** — return `{"detail": "Internal server error"}` with no
   stack trace, SQL, or internal state included in the response body.
2. **Global `@app.exception_handler(Exception)`** — catches anything that escapes route
   handlers; returns the same generic 500 response and logs the full exception server-side
   via `logging.exception()`.

---

## Git Audit Trail — Security Commits

| Commit | Description |
|--------|-------------|
| `675e262` | Email allow-list on all auth entry points; protect open routes with JWT; disable `/api/docs` and `/api/redoc` in production |
| `898167e` | Disable `openapi_url` (`/openapi.json`) in production; remove docs path hint from root endpoint |
| `b5d1bee` | Add both allowed emails (`ashraful.alam@gmail.com`, `tafheem88@gmail.com`) to `deploy-quick.sh` |
| `47ababb` | Add SECURITY.md with access control, route protection table, test results, and secrets audit |
| `75fd016` | Fix allow-list bypass on password login and MFA verify; require TOTP code to disable MFA; harden JWT secret detection; sanitize 500 error responses; add global exception handler; remove debug prints |

---

## Live Security Test Results

### Round 3 — 2026-05-29 — revision `clearcomply-backend-00007-bnj`

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | `GET /health` | 200 | ✅ 200 |
| 2 | `GET /api/assessments` — no auth token | 403 | ✅ 403 |
| 3 | `GET /api/poam` — no auth token | 403 | ✅ 403 |
| 4 | `GET /api/dashboard` — no auth token | 403 | ✅ 403 |
| 5 | `GET /api/audit-log` — no auth token | 403 | ✅ 403 |
| 6 | `GET /api/docs` — docs disabled | 404 | ✅ 404 |
| 7 | `GET /api/redoc` — redoc disabled | 404 | ✅ 404 |
| 8 | `GET /openapi.json` — schema disabled | 404 | ✅ 404 |
| 9 | `POST /api/auth/register` with `hacker@evil.com` | 403 | ✅ 403 |
| 10 | `GET /api/frameworks` — intentionally public | 200 | ✅ 200 |

**All 10 tests passed.**

### Round 4 — 2026-05-29 — revision `clearcomply-backend-00008-97q`

Deep code review identified 6 additional vulnerabilities — all fixed in commit `75fd016`
and verified live.

| # | Vulnerability | Fix | Verified |
|---|---------------|-----|----------|
| 1 | Allow-list bypass: `login_password` did not call `is_email_allowed()` — a DB user not on the allow-list could log in with a password | Added `is_email_allowed()` check at start of handler; returns 403 | ✅ 403 |
| 2 | Allow-list bypass: `mfa_verify` did not call `is_email_allowed()` — same bypass via MFA completion | Added `is_email_allowed()` check at start of handler; returns 403 | ✅ 403 |
| 3 | MFA could be disabled with only a valid JWT — no TOTP required | `mfa_disable` now requires `totp_code` in request body, verified via `pyotp.TOTP.verify()` | ✅ 422 without code |
| 4 | Five `except Exception as e` blocks leaked `str(e)` (SQL, paths, internal state) in HTTP 500 bodies | All replaced with generic `"Internal server error"` | ✅ No leakage |
| 5 | Debug `print()` statements in `routes.py` exposed framework names/counts to container logs | Removed | ✅ Removed |
| 6 | No global exception handler — unhandled exceptions could return FastAPI default error format | Added `@app.exception_handler(Exception)` logging internally and returning generic 500 | ✅ Active |
| + | JWT default secret used silently if `JWT_SECRET_KEY` env var not set | Startup `warnings.warn()` emitted when known default key is detected | ✅ Active |

**All 11 live probe tests passed on revision `clearcomply-backend-00008-97q`.**

### Test commands (reproducible)

```bash
BASE="https://clearcomply-backend-zuaomuy57q-uc.a.run.app"

curl -s -o /dev/null -w "HTTP %{http_code}\n" "$BASE/health"
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$BASE/api/assessments"
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$BASE/api/poam"
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$BASE/api/dashboard"
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$BASE/api/audit-log"
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$BASE/api/docs"
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$BASE/api/redoc"
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$BASE/openapi.json"
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"hacker@evil.com","password":"Password123!","name":"X"}'
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$BASE/api/frameworks"
```

---

## Google OAuth Configuration

The OAuth 2.0 client (`440433810610-v59q0ah2d45o1fvginicsvrt7k5le76j`) is configured
in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with:

**Authorized JavaScript origins:**
- `https://clearcomply-frontend-zuaomuy57q-uc.a.run.app`

**Authorized redirect URIs:**
- `https://clearcomply-frontend-zuaomuy57q-uc.a.run.app`

Any login attempt from an origin not in this list is rejected by Google before it
even reaches the backend.
