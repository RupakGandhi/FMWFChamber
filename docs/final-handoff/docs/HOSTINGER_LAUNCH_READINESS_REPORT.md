# FMWF Chamber Application Platform: Hostinger Launch-Readiness Review

**Review date:** August 29–30, 2026  
**Environment reviewed:** `https://mediumvioletred-alpaca-519743.hostingersite.com`  
**Benchmark:** `https://fmwfapps-j4ebl3f4.manus.space`  
**Recommendation:** **No-Go for Chamber domain cutover and public launch.** The Hostinger deployment is a useful staging build, but it must receive and pass the included remediation package before it can represent the Chamber-approved platform.

## Executive Finding

The deployment is not an empty shell. Native Chamber staff access, account-free reviewer links, application-status lookup, the participant data API, accepted-attendee Check-In, Undo, Cancelled/No-Show handling, optional No-Show flags, CSV/Excel/PDF controls, Help Center, and Guided Tour all loaded or completed meaningful testing. However, a portability error in the Hostinger MySQL integration returns JSON columns as strings rather than objects. That one defect prevents program configuration from reloading correctly and cascades into the Form Builder, public custom questions, scoring, template editing, capacity/waitlisting, and form-data exports. The current host is therefore **not ready** to be placed under a Chamber-facing address.

## Tested Functionality

| Workflow | Hostinger result | Launch assessment |
|---|---|---|
| Individual native Chamber staff account | Successful sign-in and administrator access | Pass |
| Three initial Chamber programs | Present as Draft and hidden from public applicants | Pass; retain Draft until configured and approved |
| New Program creation | Temporary QA event program created | Pass |
| Form Builder save/reload | Fatal `undefined.length` error after field save | **Blocker** |
| Program Settings / email-template persistence | Server stores data, but returns JSON strings and UI reloads defaults | **Blocker** |
| Public application baseline / confirmation number | Successful | Partial pass |
| Public configured custom fields | Not rendered because `formConfig` is serialized | **Blocker** |
| Applicant Status portal | Successful lookup by confirmation number | Pass |
| Reviewer account-free link and assignment | Successful long opaque link and assigned application visibility | Pass |
| Blind review / configured scoring / editing | Not testable because configurations do not hydrate | **Blocker** |
| Acceptance / secure participant token | Successful | Pass |
| Participant form data API | Pronunciation, commander, attendees, T-shirts, guest, dietary, accommodation data saved and displayed | Pass |
| Participant form UI | Rejects completed records because the primary name is not mirrored into attendee 1 | **Blocker** |
| Check-In / Undo / Cancelled / No-Show / optional flag | Successful; temporary flag then removed | Pass |
| Capacity and waitlist | Second request was not waitlisted after accepted capacity had been reached | **Blocker** |
| CSV/Excel/PDF | Controls run, but serialized form data corrupts export columns; Excel is HTML `.xls` rather than a native `.xlsx` workbook | **Blocker for acceptance** |
| Annual Archive | Current remote build has not been rechecked after the source fix that closes archived programs | Redeploy and verify |
| Guided Tour | Loaded and navigated successfully | Pass; retain |
| Help Center / testing guide | Help Center works; linked public Demo Guide is stale | Needs update |
| Apps Hub splash page | Not deployed; Hostinger root is application portal only | Required before full Chamber apps architecture launch |

## Required Remediation Before Any DNS Change

1. Apply the current source package and normalize MySQL JSON in `server/db.ts` before program and application records reach the client or export routines.
2. Redeploy with the defensive Form Builder configuration defaults, attendee-name synchronization, waitlist-aware confirmation flow, accurate confirmation wording, archive status update, and staff-only Feature Testing Guide.
3. Run all database migrations through `0008_magenta_whiplash.sql`, set the permanent `PUBLIC_APP_URL` only after final domain mapping, and keep demo mode disabled.
4. Test a new disposable QA program end to end: Form Builder field persistence; Settings; email templates; public custom-field validation; two reviewers and score editing; acceptance; participant form; T-shirts; Check-In/Undo/No-Show; capacity waitlist; manual promotion; CSV/Excel/PDF; and archive retirement.
5. Remove the original QA program **“QA Hostinger Audit — Delete After Testing”** (ID `4`) using the new **Delete Permanently** action after remediation validation. Its reviewer and flag were already removed and the program was archived; the current package adds safe removal of its retained test records.
6. Keep `/demo-guide` behind staff authentication as **Feature Testing Guide**. Do not expose Demo Mode branding, test accounts, or demo reviewer links on the permanent site.
7. Deploy the standalone Apps Hub at `apps.fmwfchamber.com` only after the Program Applications and Corporate Cup destinations pass final HTTPS checks.

## Domain and Hosting Decision

The Chamber’s existing Hostinger plan appears unsuitable for its Node.js application requirement, while the current staging site is hosted on OptimizED’s Hostinger Business plan. The recommended option is therefore **OptimizED-managed Node hosting with Chamber-branded subdomains**, as long as the agreement and operational records preserve the Chamber’s domain ownership and OptimizED’s ongoing administrative access. The staging hostname is never the Chamber production URL.

| Purpose | Target after contract and staging acceptance | Owner / administrator |
|---|---|---|
| Apps Hub | `https://apps.fmwfchamber.com` | Chamber domain; static deployment managed by OptimizED/Qaisar |
| Application Platform | `https://applications.fmwfchamber.com` | Chamber domain; Node app managed by OptimizED/Qaisar |
| Corporate Cup | Verified live destination, then link from Apps Hub | Confirm owner and correct current 404 before publication |
| Source repository / Hostinger / database / SMTP | OptimizED organization account with Qaisar as collaborator | OptimizED maintains access; Chamber retains domain ownership |

> The Chamber should not be asked to “redirect” its site yet. First, Qaisar must redeploy, verify the staging build, enter the Hostinger custom-domain screen, and provide the exact DNS target or verification record. The Chamber’s DNS/website administrator can then create the specific record. A Chamber-site “Custom Applications” navigation link to the Apps Hub is the final website-edit step.

## Immediate Security Action

Several credentials and one-time verification codes were sent in the deployment conversation. Rotate all credentials used during that exchange—Hostinger, Chamber hosting/email, GitHub, database, SMTP, and the temporary Chamber QA account—and replace them with individually named accounts. Do not place credentials in source, email attachments, chat threads, or the final repository.

## Answer to the Demo Guide Question

**Keep the guidance, not the public demo.** The Guided Tour and Help Center should remain permanent staff resources. The existing public “Demo Guide” should be replaced by the new authenticated **Feature Testing Guide** so staff can learn and safely test every workflow without exposing test content, credentials, or reviewer links.

## Sources

1. `hostinger_audit_notes.md` — detailed authorized test evidence and observed behavior.
2. `HOSTINGER_REMEDIATION_BRIEF.md` — source changes and Qaisar remediation instructions.
3. `hostinger_domain_cutover_plan.md` — post-contract subdomain and Apps Hub procedure.
4. `production-readiness-verification.md` — canonical source build and data-backed acceptance evidence.
