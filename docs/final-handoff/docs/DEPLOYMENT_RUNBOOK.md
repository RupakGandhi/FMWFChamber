# Production Deployment Runbook

## 1. Objective and Benchmark

Deploy a clean permanent instance of the FMWF Chamber Application Management Platform and the reusable Chamber Apps Hub. The production application must reproduce the Chamber-approved benchmark at [https://fmwfapps-j4ebl3f4.manus.space](https://fmwfapps-j4ebl3f4.manus.space), use native Chamber-managed staff accounts, and preserve permanent OptimizED access for combined maintenance.[1]

## 2. Approve the Hosting Architecture First

Before deploying, complete `HOSTING_AND_ACCESS_DECISION.md` and return a written recommendation to OptimizED. Hostinger is acceptable only if the available plan runs a persistent Node 22/Express service, MySQL-compatible database, environment secrets, HTTPS custom domains, logs, backups, and safe restart/rollback. A capable Chamber-controlled host or managed Manus hosting is also acceptable if both the Chamber and OptimizED receive the required ongoing access.

Do not treat static or WordPress-only hosting as a compatible destination. Do not move DNS until a temporary production URL has passed acceptance.

## 3. Required Inputs

| Owner | Required Input |
|---|---|
| OptimizED | Final ZIP and SHA-256; approved benchmark; replacement Exhibits; hosting approval; named technical contacts |
| Chamber | Domain/DNS contact; administrator names and emails; SMTP details; final program dates, forms, scoring, email wording, ticket settings, and testers |
| Qaisar | Hosting compatibility record; deployment access; clean database; secure secret-entry method; backup/restore and rollback access |

Never send live passwords or database credentials in email or store them in source. Enter secrets in the approved hosting secret manager.

## 4. Verify the Source Package

Verify the ZIP against its SHA-256 checksum. Confirm there is no `.env`, database dump, SMTP password, account password, `node_modules`, `.git`, demo application data, or production secret.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

Expected baseline: TypeScript passes, **67 standard tests pass**, the two opt-in database suites are skipped, and the production build completes. A Vite bundle-size warning is non-blocking unless a new build error accompanies it.

## 5. Provision the Runtime

Use Node.js 22 and a MySQL-compatible database. The application must receive its port from the host; do not hardcode a port. Configure the values in `ENVIRONMENT_MATRIX.md`, including a high-entropy `JWT_SECRET` and the final `PUBLIC_APP_URL`.

Do not set `ENABLE_DEMO_LOGIN`, `DEMO_USERNAME`, or `DEMO_PASSWORD` in production. Manus OAuth values are not part of the native production account flow and are not required on an external deployment.

## 6. Create a Clean Database and Apply Migrations

Create an empty production database. Do not copy the demonstration database. Apply all checked-in migrations in order:

```bash
pnpm drizzle-kit migrate
```

The migration directory must contain `0000_bitter_puff_adder.sql` through `0008_magenta_whiplash.sql`. Migration `0006` adds secure participant tokens, `0007` persists commander and attendee data, and `0008` adds native staff usernames, password hashes, activation, forced password changes, failed-login tracking, and lockout fields. Do not regenerate or rename migrations during production deployment.

## 7. Create the First Native Administrator

Set the bootstrap values only for this command; do not store the password in a committed file:

```bash
ADMIN_USERNAME='chosen.username' \
ADMIN_PASSWORD='temporary-strong-password' \
ADMIN_NAME='Full Name' \
ADMIN_EMAIL='person@fmwfchamber.com' \
node scripts/create-native-admin.mjs
```

The first administrator signs in at `/staff-login` and must replace the temporary password. Under **System → Staff Accounts**, create separate administrators for each authorized Chamber staff member and for designated OptimizED maintenance personnel. Do not share one account.

## 8. Seed the Three Programs as Drafts

Run against the empty production database:

```bash
PRODUCTION_SEED=true PROGRAM_YEAR=2027 node scripts/seed-programs.mjs
```

This creates Leadership FMWF, The Awards / Chamber Choice Awards, and Military Appreciation Night as drafts without demo applicants, reviewers, scores, credentials, or demo deadlines. Do not run any demo reviewer or test-application seed script.

## 9. Deploy to a Temporary Production URL

Use the provider’s Node application workflow. The generic build/start commands are:

```bash
pnpm build
pnpm start
```

Verify the root page, `/staff-login`, one protected admin route, one reviewer token route using a temporary reviewer, and `/api/trpc`. Confirm secure cookies, no server error, and no browser-console error.

For managed Manus hosting, save an approved checkpoint and use the platform Publish control. For Hostinger or another provider, document the exact deployment, log, restart, and rollback procedure in the returned hosting decision record.

## 10. Configure Programs

For each draft, Chamber staff must approve public name, description, deadline, form fields, required and conditional rules, scoring, reviewer controls, email templates, and public URL before status changes to Open.

| Military Night Setting | Required Initial Position |
|---|---|
| Ticket decisions | Manual; no automatic approval |
| Fulfillment order | Not first-come-first-served |
| Ticket field | `ticket_count` |
| Capacity and threshold | Chamber-confirmed values |
| Capacity-based waitlist | Enable only with Chamber approval |
| Automatic promotion | Off unless the Chamber expressly changes it |
| Participant Form and Check-In | On |
| T-shirt and No-Show tracking | Set to the Chamber’s current cycle decision |

## 11. Configure Chamber Email

Use **System → Email Configuration**. Enter the Chamber-approved SMTP settings and send a test to a Chamber-controlled mailbox. Verify confirmation, reviewer assignment, reviewer reminder, and approval/status messages. Confirm every generated link uses the final `PUBLIC_APP_URL`.

The stored SMTP password is encrypted at rest using `JWT_SECRET`. Preserve that secret for restore; changing it without first re-entering SMTP credentials prevents the stored password from being decrypted.

## 12. Deploy the Apps Hub and Domains

Deploy `handoff/apps-hub/index.html` as the Apps Hub. The recommended structure is `apps.fmwfchamber.com` for the hub and `applications.fmwfchamber.com` for the platform, with the existing Corporate Cup production URL linked from the hub. Equivalent Chamber-controlled addresses are acceptable after OptimizED approval.

Create the provider-required DNS records or redirects. Confirm valid HTTPS, secure-cookie behavior, no mixed content, and working hub links. Set `PUBLIC_APP_URL` to the final application origin and restart if required.

## 13. Run Acceptance

Complete `LAUNCH_ACCEPTANCE_CHECKLIST.md`. Compare the production UI and workflows side by side with the published benchmark. Use clearly prefixed temporary records and remove them after sign-off.

Run both database-backed suites only in an isolated empty or disposable database:

```bash
RUN_DB_E2E=true pnpm vitest run \
  server/e2e-native-accounts.test.ts \
  server/e2e-production-workflows.test.ts
```

The suites create and delete their own temporary records. Never run them against the live database after real submissions begin.

## 14. Backup, Cutover, and Monitoring

Complete a database backup and restore drill before launch. Obtain written OptimizED and Chamber approval, take a pre-cutover backup, confirm program statuses and deadlines, publish the Apps Hub link, and monitor logs, database connections, native login, SMTP, submissions, reviewer access, and Military Night counts during the agreed launch window.

## 15. Rollback

Before public data exists, rollback can restore the prior application release and DNS target. After public data exists, stop writes, preserve logs, restore the verified database backup into a new database, point the last approved application release to that database, and verify record counts and workflow access before reopening. Never improvise a destructive production SQL repair.

## 16. Required Return to OptimizED

Return the approved hosting decision, production and staging URLs, hosting/database/DNS owners, Chamber and OptimizED administrator list, deployment version, source checksum, backup identifier, restore evidence, SMTP evidence, completed acceptance checklist, rollback instructions, and unresolved issue log. Do not include secret values.

## References

[1]: https://fmwfapps-j4ebl3f4.manus.space "Published Application Management Platform benchmark approved for permanent replication"
