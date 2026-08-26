# Launch Acceptance Checklist

Record evidence, owner, and date. A checked box without a result or named verifier is not sufficient.

## Release Identification

| Item | Value |
|---|---|
| Source ZIP and SHA-256 |  |
| Deployed version/release |  |
| Hosting provider/account owner |  |
| Production application URL |  |
| Apps Hub URL |  |
| Corporate Cup URL |  |
| Database identifier |  |
| Qaisar verifier |  |
| Chamber verifier |  |
| OptimizED approver |  |

## Hosting, Access, and Security

- [ ] OptimizED approved the completed Hosting and Ongoing Access Decision.
- [ ] The runtime supports Node 22/Express, MySQL, environment secrets, HTTPS, logs, backups, restart, and rollback.
- [ ] Chamber operational access and permanent OptimizED administrator/developer access are documented for the application, hosting, database, source/deployment, logs, and backups as appropriate.
- [ ] Production uses a clean database with no demo applicants, reviewers, scores, or shared credentials.
- [ ] Ordered migrations `0000` through `0008` applied successfully.
- [ ] `AUTH_MODE=native`; `SESSION_APP_ID` is stable; `PUBLIC_APP_URL` is the approved final HTTPS origin.
- [ ] `ENABLE_DEMO_LOGIN`, `DEMO_USERNAME`, `DEMO_PASSWORD`, and `RUN_DB_E2E` are unset during normal production service.
- [ ] `JWT_SECRET` is new, high entropy, and stored in the approved secret manager and recovery process.
- [ ] SMTP password is encrypted at rest and the browser/API receives only a mask.
- [ ] Reviewer and participant links use unguessable tokens and the final production origin.
- [ ] HTTPS redirect, session cookies, and mixed-content checks pass.

## Native Chamber Staff Accounts

- [ ] The first administrator was created with `scripts/create-native-admin.mjs`.
- [ ] The first administrator can sign in at `/staff-login` and is forced to replace the temporary password.
- [ ] An administrator can create a second Chamber administrator and a separate OptimizED maintenance administrator.
- [ ] Temporary credentials are shown once and copied securely.
- [ ] Password reset forces another password change.
- [ ] Five invalid attempts create a timed lock; an authorized administrator can unlock the account.
- [ ] Deactivated accounts lose access, including an existing session.
- [ ] An administrator cannot deactivate their own account or remove the final active administrator.
- [ ] Browser responses and logs contain no password hash or plaintext password.
- [ ] Reviewer links still work without a staff account.

## Program Configuration

- [ ] Leadership FMWF name, year, public copy, deadline, form, scoring, review settings, and templates are approved.
- [ ] The Awards name, year, public copy, deadline, form, scoring, review settings, and templates are approved.
- [ ] Military Appreciation Night copy, deadline, fields, capacity, threshold, templates, and event settings are approved.
- [ ] Military Night remains manual allocation with no automatic approval or first-come fulfillment.
- [ ] Automatic waitlist promotion remains off unless the Chamber approves it.
- [ ] Programs remain Draft until the Chamber approves opening them.
- [ ] Add New Program creates a reusable configuration without changing hardcoded source.

## Applicant and Review Workflow

- [ ] A missing required field is rejected server-side.
- [ ] A valid public submission returns a confirmation number and status lookup works.
- [ ] Two reviewers can be assigned, unassigned, and reassigned without reviewer accounts.
- [ ] Blind review hides configured identifying information.
- [ ] Both reviewers can score and comment; allowed edits update aggregates.
- [ ] Disabled/late edits and low scores without required comments are rejected.
- [ ] Progress, comparison, ranking, CSV, Excel, and printable PDF show both reviewers correctly.

## Military Night Workflow

- [ ] Ticket quantity appears in Applications and total-request cards.
- [ ] Configured threshold produces the in-platform alert.
- [ ] Staff can accept a later request before an earlier request.
- [ ] Approval creates/copies a secure Participant Form link.
- [ ] Participant Form stores T-shirts, guests, pronunciation, commander, rank, branch, years of service, dietary/accessibility, and attendees.
- [ ] Duplicate Participant Form submission is rejected.
- [ ] Only accepted requests appear in Check-In.
- [ ] Picked Up, Cancelled, No-Show, notes, and Undo persist correctly.
- [ ] No-Show can prompt an optional flag; Cancelled does not automatically flag.
- [ ] Capacity-based waitlist placement uses accepted allocation rather than submission order.
- [ ] Manual promotion updates waitlist and application status and can send the configured approval message.

## Email

- [ ] SMTP connection test reaches a Chamber-controlled mailbox.
- [ ] Chamber email administrator confirms appropriate SPF, DKIM, and DMARC configuration.
- [ ] Confirmation, reviewer assignment, reviewer reminder, and approval/status templates send correctly.
- [ ] Reviewer and participant links use the final domain.
- [ ] Core workflows remain usable when SMTP is disabled.

## Apps Hub, Benchmark, and Mobile

- [ ] Production is compared side by side with `https://fmwfapps-j4ebl3f4.manus.space` for every principal screen and workflow.
- [ ] Apps Hub displays Program Applications, Corporate Cup, and future-app structure; all live links use approved HTTPS destinations.
- [ ] Public application/status, reviewer scoring, staff login, Staff Accounts, Program cards, Applications, Settings, Check-In, Waitlist, Export, Guided Tour, and Help Center are usable at 390×844.
- [ ] Keyboard focus is visible and the Apps Hub skip link works.
- [ ] Browser console, network logs, and server logs show no unresolved application error.

## Automated and Data-Backed Verification

- [ ] `pnpm check` passes.
- [ ] `pnpm test` passes all 67 standard tests.
- [ ] `pnpm build` completes.
- [ ] In an isolated database, `e2e-native-accounts.test.ts` passes and removes temporary accounts.
- [ ] In an isolated database, `e2e-production-workflows.test.ts` passes and removes temporary programs and workflow data.
- [ ] `RUN_DB_E2E` is removed from the normal production environment after testing.

## Backup, Restore, and Rollback

- [ ] Automated backups are active and ownership is recorded.
- [ ] A pre-launch on-demand backup identifier is recorded.
- [ ] Backup restores successfully to an isolated database using the same `JWT_SECRET`, `AUTH_MODE`, and `SESSION_APP_ID`.
- [ ] Native login, record counts, critical workflow data, and encrypted SMTP metadata are verified in the restored environment.
- [ ] Last approved application release and DNS rollback targets are recorded.
- [ ] Incident owner and recovery contact are documented.

## Handoff and Approval

- [ ] Chamber receives production URLs, administrator guide, native accounts, Guided Tour, Help Center, and access-owner record.
- [ ] OptimizED receives permanent production access, technical package, checksum, deployment record, backup/restore evidence, and unresolved issue log.
- [ ] Qaisar returns the hosting decision record and exact deploy/restart/rollback instructions.
- [ ] Chamber confirms operational owners for programs, reviewers, email, exports, archives, flags, and Staff Accounts.
- [ ] Go-live approval is recorded below.

| Approval | Name | Decision | Date | Notes |
|---|---|---|---|---|
| Chamber |  |  |  |  |
| OptimizED |  |  |  |  |
| Qaisar / Deployment Developer |  |  |  |  |
