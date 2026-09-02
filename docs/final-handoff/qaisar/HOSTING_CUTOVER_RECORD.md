# Hosting and Cutover Record

**Date:** September 2, 2026
**Staging URL:** `https://mediumvioletred-alpaca-519743.hostingersite.com`
**Status:** Staging only. No Chamber DNS has been requested or changed.

## (a) Where the Application and Database Live

| Component | Location |
|---|---|
| Node.js 22 application | Hostinger Node.js App, deployed via LiteSpeed's managed Node process (`lsnode`), on the Hostinger account currently hosting this staging site |
| MySQL database | MySQL 8.4 instance on the same Hostinger account, accessed at `127.0.0.1:3306` from the application (same-host connection, not exposed externally) |
| Source repository | `https://github.com/RupakGandhi/FMWFChamber` (GitHub), auto-deploying to Hostinger on push to `main` |
| Static Apps Hub (`handoff/apps-hub/index.html`) | Approved, not yet deployed. Confirmed target is `apps.fmwfchamber.com`, hosted as a static file — this can be served from the same Hostinger account (e.g. via `public_html` on a subdomain) or wherever the Chamber's main site/DNS is already managed. It is a plain static HTML file with no build step or server dependency, and already links out to `applications.fmwfchamber.com` (this app) and the existing live `corporatecup.fmwfchamber.com`. |

This matches the architecture already recommended in `docs/final-handoff/docs_retest/hostinger_domain_cutover_plan.md`: OptimizED-managed Hostinger hosting, Chamber-branded subdomains.

## Go-Live Data Sequencing

Per direction from OptimizED: the current staging database (Draft-only Chamber 2027 programs, no real applicant data, no live SMTP) stays in place through contract signature and final staging sign-off. At that point, before Chamber DNS is cut over, the following must happen in order:

1. Provision a **clean production database** (either reset this database or point the app at a new one) — no leftover staging/QA rows.
2. Configure **real Chamber SMTP credentials** (currently unset/staging placeholders) in hPanel's Environment Variables.
3. Re-enter the three 2027 program details as final (dates, capacity, form copy) and set each to the desired live status.
4. Only then proceed to the DNS cutover steps in section (b).

This ordering avoids sending real applicants any email through unconfirmed SMTP, and avoids carrying test data into the production launch.

## (b) DNS Records for `apps.fmwfchamber.com` and `applications.fmwfchamber.com`

**These values cannot be generated in advance — Hostinger issues them only when you initiate adding each custom domain in hPanel, and I don't have hPanel access to trigger that.** Do not guess or reuse values from another domain.

To get them:

1. In hPanel, open the Node.js App for this project → **Domains** (or **Custom Domain**) settings.
2. Add `applications.fmwfchamber.com` as a custom domain. Hostinger will display the exact record it requires (typically a CNAME to a Hostinger-provided target, occasionally an A record with a specific IP — it varies by plan).
3. Repeat for wherever the Apps Hub static file (`apps.fmwfchamber.com`) will be served — if that's a separate Hostinger property or subdomain rather than folded into the same Node app project, it will have its own record.
4. Since `corporatecup.fmwfchamber.com` is already live under this same `fmwfchamber.com` domain, whoever manages that subdomain's DNS can confirm the record type/pattern the Chamber's DNS host already uses for Chamber subdomains — the new records will very likely follow the same pattern, which is a useful cross-check against whatever hPanel displays in step 2–3.
5. Record the exact values below and send them to the Chamber's DNS administrator — do not ask for a bare "redirect."

| Subdomain | Purpose | Record type | Record value |
|---|---|---|---|
| `applications.fmwfchamber.com` | Application platform (this Node app) | *(fill in from hPanel)* | *(fill in from hPanel)* |
| `apps.fmwfchamber.com` | Static Apps Hub | *(fill in from hPanel)* | *(fill in from hPanel)* |

Once DNS propagates, verify HTTPS resolves cleanly on both hostnames before telling the Chamber the cutover is complete, and only then set `PUBLIC_APP_URL=https://applications.fmwfchamber.com` in hPanel's Environment Variables (replacing the current staging URL) and restart.

## (c) HTTPS, Deployment, Logs, Restart, Rollback, Backup, Restore

These procedures are documented from direct hands-on use this session, not assumptions.

### HTTPS
Hostinger issues and renews TLS automatically for the app's bound domain(s) once a custom domain is added and DNS resolves to it. No manual certificate management is required.

### Deployment
Push to `main` on GitHub. Hostinger's Node.js App is connected to this repository and auto-builds and redeploys on push (`pnpm install` → `pnpm build` → restart). A deploy typically completes and goes live within about a minute of the push; confirm by checking the "Deployments" tab in hPanel, or via SSH:
```bash
cd ~/domains/<domain>/hbuilds
ls -la current   # symlink target's timestamp/version ID = the live build
cd current/nodejs && git log -1
```

### Logs
Two useful sources:
- **hPanel → Runtime Logs** (UI).
- Directly on disk, per deployed version: `~/domains/<domain>/hbuilds/current/nodejs/console.log` and `stderr.log` (JSON-lines, application `console.log`/`console.error` output — this app also logs full tRPC error objects with cause chains here, not just messages).
- Build logs for every deploy attempt: `~/domains/<domain>/hbuilds/logs/<deployment-id>/*.log`.

### Restart
Hostinger restarts the app automatically on every deploy. To force a restart without a new deploy, use hPanel's "Redeploy" action, or `touch` a file the process manager watches (check hPanel — there wasn't a documented manual restart button found via SSH alone).

### Rollback
Every deploy is kept as its own immutable folder under `hbuilds/versions/<id>/`, independent of the `hbuilds/current` symlink. To roll back:
```bash
ls -la ~/domains/<domain>/hbuilds/versions/      # find the prior known-good version ID
ln -sfn versions/<prior-id> ~/domains/<domain>/hbuilds/current
```
This is a filesystem-level fallback if hPanel doesn't expose a rollback button; using hPanel's own deployment history (if available) is preferable when possible, since it will also restart the process cleanly. **Confirm the process actually restarts against the repointed symlink before relying on this** — it wasn't exercised end-to-end this session.

### Backup and Restore
Not yet established for this specific database. Recommended before any production data exists:
```bash
mysqldump -h 127.0.0.1 -P 3306 -u <user> -p <database> > backup-$(date +%F).sql
```
scheduled via cron on the Hostinger account, with backups copied off-host (Hostinger's own account-level backup feature, if included on this plan, should also be verified and is likely the simpler option — check hPanel → Backups). **A restore drill has not yet been performed and must be completed before launch**, per the deployment runbook's own requirement.

## (d) Ongoing Access — Chamber and OptimizED

| System | Current state | Action needed |
|---|---|---|
| GitHub repository | Owned by `RupakGandhi` (OptimizED) on GitHub; already satisfies "OptimizED organizational ownership, Qaisar as collaborator" | None — already correct |
| Hostinger account | Account used for this staging deployment — **ownership (who holds the login/billing) not confirmed in this record** | Confirm and document who owns/pays for this Hostinger account, and add named individual OptimizED and Chamber technical contacts as needed |
| Production database | Same Hostinger account/MySQL instance | Same as above |
| Domain `fmwfchamber.com` / DNS | Chamber-controlled per existing arrangement | Confirm Chamber retains DNS ownership; OptimizED needs no DNS access, only the ability to request records via the Chamber's DNS administrator |
| Native staff accounts | One bootstrap admin (`chamber`) currently exists on staging | Per the deployment runbook: create separate named admin accounts for each authorized Chamber and OptimizED staff member under **System → Staff Accounts** before launch; retire the shared bootstrap account |

**I can't confirm Hostinger account ownership or arrange named-individual access myself** — that's an account-holder action, not something reachable via SSH.

## Current QA State

All temporary QA programs, the QA reviewer, and one throwaway admin account created during Hostinger acceptance testing have been permanently deleted from the staging database as of this record. Only the three Chamber 2027 Draft programs (Leadership FMWF, Chamber Choice Awards, Military Appreciation Night) remain, all in Draft status, untouched throughout testing.
