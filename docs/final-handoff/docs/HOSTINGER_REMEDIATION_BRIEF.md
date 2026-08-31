# FMWF Chamber Application Platform — Hostinger Remediation Brief

**Status:** Do **not** launch or connect Chamber DNS yet. The current Hostinger address is a functional staging candidate, but independent testing confirmed launch-blocking data-hydration defects. The attached source package contains the required corrections.

## What the Chamber Approved

The Chamber approved the Enterprise Application Management Platform demonstrated at `https://fmwfapps-j4ebl3f4.manus.space`. The permanent application must reproduce that benchmark, including the three initial programs: Leadership FMWF, Chamber Choice Awards, and Military Appreciation Night. It must also remain capable of supporting future Chamber workflows that fit the existing application, awards, and registration program structures.

The Chamber selected the Enterprise scope: configurable application forms, scoring/rubrics, multiple account-free reviewers, manual approval, status tracking, configurable email templates, exports, archives, registration capacity/waitlists, secure participant follow-up, T-shirt/guest/commander logistics, event check-in, optional no-show flags, Help Center, Guided Tour, and Feature Testing Guide. Military Night allocation is manual; it must never operate as first-come, first-served or auto-approve the first requests.

## Independent Hostinger Result

| Area | Result | Required correction |
|---|---|---|
| Native staff sign-in | Passed | Keep individual Chamber staff accounts. Do not substitute OAuth or shared accounts. |
| Applicant status portal | Passed | Retain. |
| Reviewer secure token link and assignment | Passed | Retain account-free reviewer access. |
| Participant data API, Check-In, Undo, No-Show-to-optional-flag | Passed | Retain. |
| Form Builder | **Blocked** | Normalize incomplete configuration and MySQL JSON before rendering fields/criteria. |
| Settings reload | **Blocked** | MySQL is returning `settings`, `formConfig`, `scoringConfig`, and `emailConfig` as JSON strings; deserialize them on the server before returning API data. |
| Public custom fields | **Blocked** | Fix follows the same JSON-deserialization correction. |
| Program email templates | **Blocked** | Fix follows the same JSON-deserialization correction. |
| Capacity/waitlist enforcement | **Blocked** | Fix follows the same JSON-deserialization correction; the QA request was not waitlisted after the one-person accepted capacity was reached. |
| CSV / Excel data | **Blocked for acceptance** | Normalize application `formData` before returning export datasets. |
| Public confirmation copy | Needs update | Remove Interview wording, never state an email was sent without confirmed delivery, and disclose a waitlist placement. |
| Guide content | Needs update | Replace public Demo Mode page with staff-only Feature Testing Guide; keep Help Center and Guided Tour. |
| Archive | Needs update | Archive must set the program’s status to `archived` after saving the snapshot. |
| Apps Hub | Not deployed | Deploy the supplied static hub separately; do not treat the application home page as the hub. |

## Required Source Corrections Included in the Package

Apply the supplied source/patch before redeploying:

1. `server/db.ts`: portable `parseJsonColumn` normalization for program configuration and application `formData`, including export records.
2. `client/src/pages/admin/ProgramEdit.tsx`: safe defaults for missing `formConfig.fields` and `scoringConfig.criteria`.
3. `client/src/pages/public/ParticipantForm.tsx`: synchronize the primary participant name to attendee 1 before validation/submission.
4. `client/src/pages/public/Apply.tsx` and `Confirmation.tsx`: carry waitlist state to confirmation and display accurate messaging.
5. `client/src/pages/public/StatusCheck.tsx`: remove obsolete Interview workflow wording.
6. `server/db.ts`: transition a program to `archived` when archiving its snapshot.
7. `client/src/pages/admin/FeatureTestingGuide.tsx`, `AdminLayout.tsx`, `HelpCenter.tsx`, `App.tsx`, and `Home.tsx`: retain the training guide behind native staff sign-in and remove public Demo Mode navigation.

## Redeploy and Verify

1. Commit the supplied current source to the OptimizED-controlled GitHub repository and ensure the Hostinger Node application pulls that commit.
2. Run the existing migrations in order (`0001` through `0008`) against the Hostinger production database; record the migration status in the deployment log.
3. Set `PUBLIC_APP_URL` only after the final Chamber application subdomain is mapped; keep `ENABLE_DEMO_LOGIN` off in production.
4. Rebuild and restart the Node 22 application. Confirm the build completes and no stale asset cache is serving the old client bundle.
5. Create a fresh temporary Draft QA program. Confirm that Settings persist through reload, Form Builder can add/save/reload a required field, public form displays it, and the field is rejected when omitted.
6. Test the complete end-to-end event path: request → manual Accept → participant details → Check-In → Undo → No-Show optional flag → capacity waitlist → manual promotion → CSV/Excel/PDF. Remove or archive all QA records afterward.
7. Verify Feature Testing Guide, Guided Tour, and Help Center are present behind staff sign-in; `/demo-guide` must redirect to the protected Feature Testing Guide rather than expose demo materials publicly.

## Existing QA Data to Remove

The independent audit created a clearly labeled temporary program, **“QA Hostinger Audit — Delete After Testing,”** ID `4`, and two test applications under it. The program was changed to `archived`, its temporary reviewer was deleted, and its no-show flag was deleted. After deploying this remediation package, use the new **Delete Permanently** action on the archived program’s three-dot menu. It removes the program and its program-owned applications, scores, participant forms, check-ins, waitlist entries, archives, documents, reminders, and email logs; it deliberately retains cross-program Applicant Flags. Do not alter the three Chamber 2027 Draft programs (IDs `1`, `2`, and `3`).

## Permanent URL and Apps Hub After Contract Signature

Use `https://apps.fmwfchamber.com` as the Chamber-branded Apps Hub and `https://applications.fmwfchamber.com` as the application platform. Keep the current `mediumvioletred-alpaca-519743.hostingersite.com` address as staging only. Qaisar must first provide the exact Hostinger custom-domain record/verification values; the Chamber’s DNS/web administrator then creates the requested records. Do not ask the Chamber merely for a “redirect” until the application is fully serving under its final hostname and HTTPS is verified.

The supplied `handoff/apps-hub/index.html` is static and should link to the final Program Applications address, the verified Corporate Cup destination, and the Chamber events calendar. `corporatecup.fmwfchamber.com` currently returns HTTP 404, so do not publish the hub link until its production destination is confirmed or repaired.

## Ongoing Access and Security

Keep the GitHub repository, Hostinger account, database, SMTP account, and deployment logs under OptimizED organizational ownership; Qaisar is a collaborator, not the sole owner. The Chamber should retain ownership of the `fmwfchamber.com` domain. Create individual named accounts for continuing access and rotate all Hostinger, GitHub, database, Chamber, and SMTP credentials that were shared during the initial deployment conversation.

## Source References

1. `../hostinger_audit_notes.md` — independent live test evidence.
2. `../hostinger_domain_cutover_plan.md` — final domain and Apps Hub procedure.
3. `../production-readiness-verification.md` — canonical benchmark test evidence.
4. `PACKAGE_INDEX.md` and `DEPLOYMENT_RUNBOOK.md` — full environment and deployment detail.
