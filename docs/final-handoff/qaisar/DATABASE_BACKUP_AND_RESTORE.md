# Database, Backup, Restore, and Retention Runbook

## 1. Production Database Principle

The production database is the system of record for programs, application data, scoring, reviewer assignments, participant logistics, event attendance, waitlists, flags, settings, archives, and SMTP configuration. Local project folders are not a database backup.

Create production from an empty MySQL-compatible database using the checked-in migrations. Do not clone demo submissions, demo reviewers, illustrative scores, or test records.

## 2. Migration Order

Apply migrations only in the journaled order:

1. `0000_bitter_puff_adder.sql`
2. `0001_moaning_lifeguard.sql`
3. `0002_misty_nightcrawler.sql`
4. `0003_loud_baron_strucker.sql`
5. `0004_flawless_stone_men.sql`
6. `0005_slippery_the_executioner.sql`
7. `0006_abandoned_warstar.sql`
8. `0007_modern_smiling_tiger.sql`
9. `0008_magenta_whiplash.sql`

Use `pnpm drizzle-kit migrate` in the target environment. Never generate a new baseline or run a destructive schema synchronization against production during cutover.

## 3. Initial Data

After successful migration, run:

```bash
PRODUCTION_SEED=true PROGRAM_YEAR=2027 node scripts/seed-programs.mjs
```

The seed skips insertion if any program already exists. Review every draft with the Chamber before opening it.

Create the first native administrator separately with `scripts/create-native-admin.mjs`. Do not insert a shared or demo administrator through the program seed.

## 4. Backup Policy

Use the database provider’s managed encrypted backups and point-in-time recovery when available. At minimum, configure an encrypted daily backup, retain daily backups for 35 days, retain a monthly backup for 13 months, and take an on-demand backup immediately before every migration, material release, bulk status operation, or public launch.

Store backup access separately from the application’s primary administrative account. Restrict restore permission to named technical administrators and enable multi-factor authentication where the provider supports it.

## 5. Backup Contents and Secrets

The database backup includes native staff usernames and password hashes, applicant personal information, reviewer activity, scores, attendance data, and the encrypted SMTP password. Treat it as confidential Client Data. Do not attach a database backup to ordinary email or include it in the source archive.

The encrypted SMTP value is only usable with the matching `JWT_SECRET`. Preserve that secret in the approved secret manager and recovery system. Do not place it inside the database backup.

## 6. Restore Drill Before Launch

Restore the latest production-candidate backup into a new, isolated database. Point a nonpublic application instance at the restored database using the same `JWT_SECRET`, `AUTH_MODE=native`, and the same `SESSION_APP_ID`. Confirm native administrator login, active-account and forced-password-change state, program count, application count, one reviewer record, one score record, one archive, and SMTP configuration metadata. Do not send email from the restored environment; keep SMTP disabled or route it to a safe test mailbox.

Record the backup identifier, backup time, restore start and finish time, verifier, row-count checks, test URL, and result. Delete the temporary restored database after approval.

## 7. Emergency Restore

If corruption or a destructive error occurs:

1. Stop or restrict writes.
2. Preserve application, browser, and database logs.
3. Record the incident time and last known good transaction.
4. Select the most recent verified clean restore point.
5. Restore to a **new** database; do not overwrite the damaged database first.
6. Start the last approved application checkpoint against the new database.
7. Validate schema version, counts, critical records, authentication, public status, and exports.
8. Change the production connection only after written approval.
9. Preserve the damaged database until the incident review is complete.

An application rollback does not automatically undo database changes. Never assume a code rollback alone is sufficient.

## 8. Data Retention Decisions

The Chamber must approve retention rules for declined applications, reviewer comments, eligibility flags, attendance records, and participant data. Annual archives preserve historical snapshots but are not substitutes for database backups or legal retention decisions. Do not automate deletion until the Chamber adopts a written retention schedule and OptimizED approves the implementation.

## 9. Monthly Operations Evidence

Record the following without exposing secrets:

| Evidence | Result |
|---|---|
| Last successful automated backup |  |
| Oldest retained daily backup |  |
| Last monthly archive |  |
| Last successful restore drill |  |
| Backup owner |  |
| Secondary recovery contact |  |
| Open backup/restore issue |  |
