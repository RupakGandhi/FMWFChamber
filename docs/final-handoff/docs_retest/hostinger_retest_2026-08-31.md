# Hostinger Re-Test Notes — August 31, 2026

**Staging URL:** `https://mediumvioletred-alpaca-519743.hostingersite.com/`  
**Purpose:** Re-test after Qaisar indicated the build was ready for verification.

## Observations Saved Before Further Testing

1. The public home page now renders normally and shows one open program, **QA Test**, while the three Chamber programs remain Draft. The program dashboard reports five total programs (one open, three draft), which is consistent with retained temporary QA records from earlier test cycles. These must be removed or archived before contract execution and any Chamber-facing launch.
2. The temporary native Chamber staff account signs in successfully and reaches the administrator dashboard. Native staff login remains operational.
3. The left sidebar contains Help & Guidance, but its Feature Testing Guide link points to `/admin/feature-testing-guide`. The canonical remediation source uses `/admin/testing-guide`; this route/name difference must be tested before declaring the deployed guide functional.
4. The current browser visual renderer briefly displayed a blank body after administrator sign-in while the page extractor returned the full dashboard text. This may be a transient browser-render condition; all substantive workflow checks will use direct route content and state verification rather than treating it as a confirmed application defect.

## Re-Test Results

| Previously observed area | Current Hostinger result | Status |
|---|---|---|
| Form Builder crash | QA Test Form Builder loads with existing fields and controls; no `fields.length` failure occurred. | Passed |
| Program JSON hydration | Settings render the stored capacity value and all program toggles as usable controls. | Passed |
| Email-template JSON hydration | A temporary QA confirmation subject was saved, reloaded, and retained. | Passed |
| Public custom fields | The configured fields “Production Test Field” and “Name” rendered on the public application’s second step. | Passed |
| Baseline public submission | An isolated QA application submitted successfully and rendered a confirmation number. | Passed |
| Confirmation content | The deployed copy no longer mentions interviews and conditionally references email notifications, but it still uses a selection-committee/reviewer narrative and differs from the final generic, waitlist-aware source copy. | Requires Qaisar copy alignment before approval |
| Participant form | Not yet re-tested on the new deployment; the current QA Test is a leadership program and is not eligible for the event-registration participant form. | Pending |
| Event capacity/waitlist/check-in | Not yet re-tested on the new deployment; requires a disposable event-registration QA program. | Pending |

The public form currently displays “Contact Information” twice in the step indicator and card heading. This is a visual-copy duplication, not a workflow failure; it should be cleaned up for a polished Chamber experience.

## Event QA Configuration Re-Test

An isolated **QA Event Retest — Delete After Testing** Event Registration program was created successfully (program ID `6`). Its Settings page correctly renders the full event configuration surface. Controlled state inspection confirmed that the one-person capacity and five relevant event toggles were present: Waitlist, Check-In, T-Shirt Tracking, Participant & Commander Follow-Up Form, and No-Show Tracking & Flag Prompt. The capacity value was set to `1`; Waitlist, Check-In, and T-Shirt Tracking were enabled; the Participant and No-Show controls were already enabled. The Save All Settings control then remained in the `Saving…` state for more than ten seconds without success or error feedback. This is a new unresolved deployment issue that prevents the final capacity, participant, and Check-In workflow re-test. Qaisar must inspect the failing `programs.updateSettings` request/server logs and provide a stable successful save before launch acceptance can continue.

Browser resource timing then showed the request as `POST /api/trpc/admin.updateProgramSettings?batch=1` with a duration of **32,262 ms** and a 356-byte response. By comparison, `programs.getById` returned in 91 ms and the prior `admin.updateProgramEmailSettings` save completed in 2,919 ms. The evidence indicates that this is a Hostinger backend/API failure or timeout specific to the settings-save mutation—not a browser form-entry issue.

## Staging Availability Failure During Event Re-Test

After the settings-save stall, an authorized `programs.update` request to open the temporary event QA program timed out at the 30-second browser-operation limit. The public QA URL then failed to render. Direct availability checks confirmed a broader degradation: both `/` and `/apply/qa-event-retest-2026-08-31` began returning an HTTP 200 response only after more than **13 seconds** and then failed to complete within a 20-second request window; an unauthenticated tRPC request returned 401 in 5.37 seconds. This is a current staging reliability blocker. Qaisar must examine the Node process health, database connections/queries, reverse-proxy timeout settings, process manager logs, and Hostinger resource limits before acceptance testing can resume.

## Event Participant Re-Test Result

The temporary event QA program recovered sufficiently to load after a later direct API save. Configuration persistence was confirmed: capacity `1`, Waitlist, Check-In, T-Shirt Tracking, Participant & Commander Follow-Up Form, and No-Show Tracking were all returned correctly by the authenticated Hostinger API. The first event request was accepted manually and generated an unguessable participant token on the Hostinger domain. The participant follow-up form correctly displayed the applicant name, pronunciation help text, commander checkbox, rank/title, branch of service, years of service, per-attendee T-shirt sizes, dietary restrictions, and special accommodations. A test commander submission with a Medium T-shirt completed and showed “Thank You,” “T-Shirts Registered: 1,” and “Total Attendees: 1.” The primary-attendee validation defect has been resolved in the deployed build.

## Remaining Current Blocker: Check-In Render

Immediately after the successful participant submission, `/admin/programs/6/checkins` stayed on an indefinite spinner. Its bundled API request returned in 2.7 seconds with valid program data, the accepted application, an empty check-in list, and a participant/T-shirt inventory response. The browser console showed no client exception. The API payload still returns `participantForms.forms[*].attendees` as a JSON string, which is a potential remaining normalization issue; Qaisar must compare the Check-In component’s loading condition and response handling with the canonical code, correct the indefinite loading state, and retest Picked Up, Cancelled, No-Show, Undo, and optional flagging before launch approval.

## Continued Re-Test Evidence

The earlier Check-In spinner recovered on a later refresh and should be logged as a staging stability concern rather than a persistent rendering failure. The page displayed both manually accepted QA attendees, correct T-shirt inventory (Medium: 1), Picked Up / Cancelled / No-Show actions, and the explanatory legend. Marking the primary attendee Picked Up updated the count and exposed Undo; Undo returned the attendee to Awaiting Pickup.

The second event request was correctly placed on the Waitlist after the first was manually accepted against the configured one-attendee capacity. The Waitlist page showed one Waiting entry and a manual Promote action. The staged confirmation page, however, still rendered the legacy normal-submission copy rather than the corrected waitlist message. The promotion action raised “Notification service URL is not configured,” and did not visibly advance the entry; the canonical source now handles notification failure without blocking the promotion, but the staging host must receive that update.

The scoring QA program persisted a new scoring criterion through a full reload, confirming that program-configuration hydration is working in the new build. Its application list contains a submitted isolated test application and a prior accepted test application, suitable for the remaining reviewer-assignment/score-tabulation re-test. Route loads can still begin with a blank-spinner state before recovering, so Qaisar must diagnose the slow/unstable request behavior before production acceptance.

## Reviewer, Export, and Staff-Guide Re-Test

The remaining scoring workflow passed with isolated QA data. A temporary reviewer was created, given an opaque account-free review link, assigned to a submitted test application, and shown the application in the reviewer portal. The reviewer submitted a 10/10 criterion score, per-criterion comment, and overall comment. The reviewer portal then moved the assignment from Pending to Completed; the administrator view showed one completed review, 10.0 average score, 10 total score, named reviewer, timestamp, and score range. The CSV export completed and contained the application response, reviewer score detail, criterion comment, and overall comment in readable columns.

The permanent **Feature Testing Guide** route also resolved after the initial spinner. It is staff-authenticated and contains current ticket management, participant/commander, check-in, waitlist, archives, review rules, export, applicant-status, and manual flagging instructions. It should remain in the final platform. The only refinement is naming consistency: the canonical package supports both `/admin/testing-guide` and `/admin/feature-testing-guide`; Qaisar should keep the latter sidebar path or redirect it to the former during the final merge.

## Current Go/No-Go Status

**No-Go for Chamber domain cutover remains in effect.** The main functional defects from the first review—JSON configuration hydration, Form Builder persistence, custom public fields, reviewer scoring, and CSV score export—now pass on Hostinger. However, the staging host still needs the current source fixes for: (1) waitlist promotion to persist even when the optional owner-notification service is unavailable; (2) correct waitlist-specific confirmation language and removal of all obsolete interview/email-sent claims; (3) safer temporary-program deletion; and (4) the latest staff Feature Testing Guide source. The Hostinger app also demonstrated intermittent blank/spinner loads and 13–30 second route/mutation delays; Qaisar must diagnose and stabilize the Node/database stack, then repeat the event workflow and response-time checks before the permanent `applications.fmwfchamber.com` mapping is approved. Live SMTP delivery remains untested because the Chamber SMTP credentials are not configured in the QA environment.

## Stability Observation

After the successful Form Builder, Settings, Email Templates, public-form, and confirmation checks, the Hostinger Programs and Administrator routes intermittently rendered blank in the automated browser. Browser console output contained no client error. Direct transport checks returned HTTP 200 for `/`, `/staff-login`, and `/admin`, but the root request timed out after receiving the HTML and a subsequent `/admin/programs` request failed during the TLS connection (`SSL_ERROR_SYSCALL`). This is not yet sufficient to attribute the condition to application code; however, Qaisar must investigate the Node process, reverse proxy, TLS termination, and connection limits before a launch decision. A stable re-test session is required for full event-workflow acceptance.

## Sources

1. Authorized browser re-test of the Hostinger staging URL on August 31, 2026.
2. Canonical remediation checkpoint `manus-webdev://5b4b72cd` for intended route and workflow behavior.
