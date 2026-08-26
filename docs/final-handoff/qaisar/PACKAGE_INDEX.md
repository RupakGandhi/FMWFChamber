# Qaisar Package Index

This is the single self-contained production package. It explains why the Chamber commissioned the platform, what it selected, what was demonstrated, how the permanent system must behave, how to choose hosting, how to deploy it, how to create native staff accounts, and how to prove readiness. The archive contains no live secret, database dump, demo applicant data, dependency folder, build artifact, or Git history.

## Required Reading Order

| Order | File or Folder | Purpose |
|---:|---|---|
| 1 | `docs/final-handoff/qaisar/EMAIL_TO_QAISAR.md` | Ready-to-send cover message explaining the project from first principles |
| 2 | `docs/final-handoff/qaisar/START_HERE_QAISAR.md` | Chamber need, Enterprise selection, three programs, benchmark, complete functionality, native accounts, and definition of done |
| 3 | `docs/final-handoff/qaisar/HOSTING_AND_ACCESS_DECISION.md` | Hostinger, Chamber-controlled, and managed-hosting options plus permanent Chamber/OptimizED access requirements |
| 4 | `docs/final-handoff/corrected-appendices/READY_TO_PASTE_APPENDICES.md` | Replacement Exhibit A and Exhibit B only; OptimizED’s standard contract body remains unchanged |
| 5 | `docs/final-handoff/qaisar/DEPLOYMENT_RUNBOOK.md` | Exact package verification, hosting approval, environment, migration, native-admin bootstrap, seed, deploy, domain, acceptance, cutover, and rollback sequence |
| 6 | `docs/final-handoff/qaisar/ENVIRONMENT_MATRIX.md` | Native production variables, prohibited demo settings, optional managed-provider values, and access ownership record |
| 7 | `docs/final-handoff/qaisar/TECHNICAL_ARCHITECTURE.md` | Stack, native authentication, token access, routes, data domains, rules, email, and boundaries |
| 8 | `docs/final-handoff/qaisar/LAUNCH_ACCEPTANCE_CHECKLIST.md` | Evidence-based functional, security, hosting, account, workflow, mobile, backup, and approval checklist |
| 9 | `docs/final-handoff/qaisar/DATABASE_BACKUP_AND_RESTORE.md` | Migration order through `0008`, native-account restore checks, retention, and recovery |
| 10 | `docs/final-handoff/qaisar/CHAMBER_ADMINISTRATOR_GUIDE.md` | Staff accounts, program operations, review, Military Night, email, export, archive, and support |
| 11 | `docs/final-handoff/production-readiness-verification.md` | Existing automated, responsive, security, migration, and data-backed evidence |
| 12 | `docs/final-handoff/apps-hub-architecture.md` | Scalable Chamber application-domain and Apps Hub design |
| 13 | `handoff/apps-hub/` | Deployable responsive Apps Hub source |
| 14 | `drizzle/` | Database schema, ordered SQL migrations, and journal |
| 15 | `scripts/create-native-admin.mjs` | One-time first native administrator bootstrap |
| 16 | `scripts/seed-programs.mjs` | Production-safe three-program draft seed |
| 17 | `server/e2e-native-accounts.test.ts` | Isolated native account lifecycle acceptance suite |
| 18 | `server/e2e-production-workflows.test.ts` | Isolated end-to-end application/reviewer/event/export suite |
| 19 | `client/`, `server/`, `shared/`, `package.json`, `pnpm-lock.yaml` | Complete application source and dependency definition |

## Contract Files Included

The corrected package includes only these replacement contract exhibits:

| File | Use |
|---|---|
| `corrected-appendices/Exhibit_A_Services.md` | Services exhibit aligned to the short signed Corporate Cup structure |
| `corrected-appendices/Exhibit_B_Cost.md` | $12,000 Enterprise implementation and $3,000 combined annual maintenance beginning January 1, 2027 |
| `corrected-appendices/READY_TO_PASTE_APPENDICES.md` | Combined copy-ready version for insertion into OptimizED’s standard agreement |

The prior standalone agreement draft and superseded long-form Appendix A/B files are intentionally excluded from the Qaisar ZIP.

## Source Layout

| Folder | Content |
|---|---|
| `client/` | React public, reviewer, staff-login, Staff Accounts, administrator, Guided Tour, Help Center, and shared UI |
| `server/` | Express/tRPC APIs, native authentication, token authorization, database helpers, SMTP, notifications, and tests |
| `drizzle/` | MySQL schema, migration journal, and migrations through native-account migration `0008` |
| `shared/` | Shared constants and types |
| `scripts/` | Native-admin bootstrap and production-safe program seed |
| `docs/final-handoff/` | Corrected exhibits, hosting decision, architecture, deployment, operating, verification, and acceptance documents |
| `handoff/apps-hub/` | Standalone static Chamber Apps Hub |

## Files Excluded

The archive excludes `.git`, `.manus`, `.manus-logs`, `.project-config.json`, `.env*`, `node_modules`, `dist`, database dumps, live credentials, demo/test seed scripts, screenshots, temporary test records, the old standalone agreement, superseded contract appendices, and internal draft notes.

## Integrity

An external `SHA256SUMS.txt` accompanies the ZIP. Qaisar must verify the hash before use and record it in the Launch Acceptance Checklist.
