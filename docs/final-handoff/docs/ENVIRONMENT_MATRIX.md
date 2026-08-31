# Production Environment Matrix

Enter values through the approved hosting secret manager. Do not create or distribute a production `.env` file, and do not place secret values in source, email, the launch checklist, or the ZIP.

## Required for Every Production Deployment

| Variable | Secret | Purpose | Required Rule |
|---|---:|---|---|
| `DATABASE_URL` | Yes | MySQL-compatible connection used by Drizzle | Clean production database; encrypted provider connection; never use the demo database |
| `JWT_SECRET` | Yes | Signs native sessions and derives the stored-SMTP encryption key | New high-entropy production value; back up securely; keep stable across restarts and restores |
| `AUTH_MODE` | No | Disables OAuth fallback and requires native staff records | `native` |
| `SESSION_APP_ID` | No | Stable namespace embedded in native session tokens | `fmwf-chamber-apps-production` or another permanent non-secret identifier |
| `PUBLIC_APP_URL` | No | Canonical origin for reviewer, participant, status, and copied links | Final HTTPS application origin, recommended `https://applications.fmwfchamber.com` |
| `NODE_ENV` | No | Production runtime behavior | `production` |
| `PORT` | No | Runtime listener | Provider-assigned; never hardcode in source |

## Explicitly Disabled in Production

| Variable | Required State | Reason |
|---|---|---|
| `ENABLE_DEMO_LOGIN` | Unset | Removes the demo-authentication procedure from production use |
| `DEMO_USERNAME` | Unset | Prevents shared demo credentials |
| `DEMO_PASSWORD` | Unset | Prevents shared demo credentials |
| `RUN_DB_E2E` | Unset during normal service | Prevents the isolated acceptance suites from being run against live production data |
| `VITE_APP_URL` | Unset or equal to `PUBLIC_APP_URL` | `PUBLIC_APP_URL` is the production source of truth |

## Native Staff Account Bootstrap

The following values are provided only to `scripts/create-native-admin.mjs` when creating the first administrator. Do not save them as long-term application variables unless the host requires a temporary command environment.

| Variable | Secret | Purpose |
|---|---:|---|
| `ADMIN_USERNAME` | Sensitive | First native administrator username |
| `ADMIN_PASSWORD` | Yes | Temporary strong password; user must replace it after first sign-in |
| `ADMIN_NAME` | No | Administrator display name |
| `ADMIN_EMAIL` | Sensitive | Administrator contact address |

## Managed Manus Values — Only If Manus Hosting Is Selected

Native Chamber staff sign-in does **not** require OAuth. If the final architecture remains on managed Manus hosting, the platform may still inject the following runtime/build values. Treat them as provider-managed and do not copy them into an external environment unless a documented feature actually requires them.

| Variable | Purpose |
|---|---|
| `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` | Existing Manus OAuth infrastructure; not used for production Chamber staff when `AUTH_MODE=native` |
| `OWNER_OPEN_ID`, `OWNER_NAME` | Existing managed-project owner metadata; not the native staff account source of truth |
| `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | Managed server services; optional on external hosting unless a retained feature calls them |
| `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY` | Managed frontend services; include only when required by the selected managed deployment |
| `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID` | Managed analytics; optional external equivalent may be configured separately |
| `VITE_APP_TITLE`, `VITE_APP_LOGO` | Managed project metadata; external build can use the checked-in site title and UI branding |

## SMTP Configuration

SMTP is configured by an authorized native administrator under **System → Email Configuration**, not through an environment variable. The stored SMTP password is encrypted with AES-256-GCM using a key derived from `JWT_SECRET`.

Preserve `JWT_SECRET` with every encrypted database backup. If it must change, securely retain the SMTP password, disable SMTP, rotate the secret, restart the application, re-enter the SMTP password, and complete a new test send. Never expose the decrypted password in documentation or source.

## Ownership and Access Record

| System | Owner | Chamber Access | OptimizED Access | Recovery Contact | Verified Date |
|---|---|---|---|---|---|
| Hosting account/project |  |  |  |  |  |
| Production database |  |  |  |  |  |
| DNS and domain records |  |  |  |  |  |
| Native staff account administration | Chamber | Required | Required |  |  |
| SMTP mailbox/provider | Chamber-designated | Required | As approved |  |  |
| Backup storage |  |  |  |  |  |
| Source repository/deployment workflow |  |  | Required |  |  |
