# Hostinger Production-Candidate Audit Notes

**Target:** `https://mediumvioletred-alpaca-519743.hostingersite.com/`  
**Audit date:** August 29, 2026  
**Source:** Authorized browser review using the temporary staff account provided by the user; Qaisar handoff conversation in `pasted_content_2.txt` and `pasted_content_3.txt`.

## Verified So Far

| Area | Result | Evidence / note |
|---|---|---|
| Public homepage | Loaded after a transient Hostinger edge CAPTCHA | Homepage identifies the FMWF Chamber Application Management System and has Staff Login, Status, and Demo Guide links. |
| Staff authentication | Passed | The supplied Chamber account signed in successfully and reached `/admin`. Do not repeat supplied credentials in reports. |
| Initial programs | Present but safely closed | Leadership FMWF 2027, Chamber Choice Awards 2027, and Military Appreciation Night 2027 are configured as **Draft**; public homepage accordingly shows no open programs. This is appropriate pre-contract/pre-launch, but it prevents public workflow verification until a temporary QA program is opened. |
| Native staff accounts | Present | The Hostinger build displays Staff Accounts and native Chamber administrator login, not an OAuth entry point. |
| Event settings UI | Loaded | QA program Settings exposes deadline, email, reminders, review rules, capacity, waitlist, check-in, T-shirt, participant/commander follow-up, no-show tracking, and ticket-threshold controls. Save behavior still requires testing. |
| Program-level navigation | Present | Programs list exposes Form Builder, Applications, Settings, Email Templates, and Copy Link for each program. |
| Public Draft protection | Passed | The temporary QA program returned “Program Not Found” until it was expressly opened through an authorized admin action. |
| Baseline public submission | Passed | An isolated test application was submitted and received a confirmation number. |

## Confirmed Blocking Defect

An isolated temporary Event Registration program (`QA Hostinger Audit — Delete After Testing`, ID 4) was created for safe testing. On Form Builder, adding a required short-text field and clicking **Save Changes** produced a fatal browser error:

> `TypeError: Cannot read properties of undefined (reading 'length')`

This occurs because a newly created or legacy program can return an incomplete `formConfig`/`scoringConfig` object and the Form Builder expects `fields`/`criteria` arrays. The source-side defensive normalization fix has been prepared and TypeScript-checked, but it is **not yet deployed to Hostinger**. This is a launch blocker because Chamber staff can create a program but cannot reliably configure its form.

## Additional Confirmed Defects

1. **MySQL JSON data is returned as a string instead of an object.** Direct authenticated API inspection after saving the QA Settings showed that the server persisted values such as the deadline, capacity, waitlist, check-in, T-shirt, participant form, no-show tracking, and ticket threshold; however, `formConfig`, `scoringConfig`, `emailConfig`, and `settings` were returned as serialized JSON strings. The client treats them as objects, so it resets controls to defaults after reload and the public form renders no configured custom questions. This is a launch blocker. The source-side portable JSON-deserialization fix has been prepared but is not deployed to Hostinger.
2. **Obsolete Interview copy remains on the public confirmation page.** The confirmation “What’s Next?” list tells applicants that top applicants may be invited for an interview, even though the Chamber explicitly removed the Interview/Calendar workflow. This must be removed before launch.
3. **The confirmation page promises an email even when program email notifications are off or SMTP is not configured.** The QA program has status email notifications off, yet the confirmation page states that an email “has been sent.” The statement must be conditional or changed to avoid a false applicant expectation.

## Current Audit State

The Hostinger deployment is **not ready for launch** until the Form Builder crash and portable JSON-deserialization defects are patched and redeployed. Testing will continue with the QA program where other routes remain accessible; all temporary records must be removed at audit completion.

## Reproduction Evidence

* A required `Applicant Name` field was created and saved in the QA Form Builder. The public application’s second step displayed “No additional questions for this section,” proving that serialized `formConfig` does not hydrate into the client.
* The QA deadline, capacity, waitlist, Check-In, T-shirt, participant-form, no-show, and ticket threshold settings were saved successfully. A fresh page load reset the visible controls to defaults even though direct API output confirmed the JSON text was stored.
* The QA confirmation-email subject was changed to `QA Confirmation {{application_number}}` and saved successfully. A fresh load reverted it to the default subject, proving the serialized `emailConfig` problem also prevents editable per-program templates from reliably loading.
* The applicant status portal successfully retrieved the isolated QA submission from its confirmation number and displayed its submitted status, applicant name, program, and submission date.
* In the administrator Application View, the empty `formData` object rendered as numbered characters (`0 {`, `1 }`) instead of a readable response set. This is the same JSON-deserialization defect affecting application records and must be normalized alongside program configuration before launch.
* A temporary reviewer was created successfully. Its “Open” control generated a Hostinger-based, account-free reviewer URL with a long opaque token and the reviewer portal loaded without a Chamber staff login. The portal correctly showed zero assignments before assignment. This path is operational.
* The temporary reviewer was successfully assigned to the QA application. The reviewer portal then showed one pending assignment and opened the review route using the correct Hostinger host.
* The reviewer portal could not exercise blind review, configured scoring criteria, score submission, or score editing: it displayed the applicant’s name, no scoring criteria, and the serialized `formData` characters. These are direct consequences of the incomplete JSON hydration already documented, not independent reviewer-link failures.
* Staff successfully changed the isolated QA application to Accepted. The application view generated a long opaque Participant Form URL on the Hostinger host.
* The secure participant form loaded and exposed full-name pronunciation, commander designation, rank, branch, years of service, multiple attendee/guest entries, per-attendee T-shirt sizes, dietary restrictions, and accommodations. It correctly summarized selected T-shirt sizes.
* The deployed participant-form UI incorrectly rejected a visibly completed two-attendee registration because its primary attendee record is not synchronized with the primary-name field before validation. A source-side correction has been prepared but is not deployed to Hostinger.
* Calling the same deployed participant-form API with the completed QA payload succeeded. The staff Application View then displayed the saved T-shirt, guest, pronunciation, dietary, accommodation, rank, branch, years-of-service, and attendee data correctly. Secure token access and backend persistence are operational.
* The Check-In page listed the accepted QA attendee, correctly reflected two T-shirt sizes, changed the temporary record to Picked Up, and then restored it to Awaiting Pickup through Undo.
* The No-Show modal clearly distinguished cancellation from a no-contact no-show, accepted the default “flag for future eligibility review” choice, saved the no-show, and created an Applicant Flag. The temporary flag must be removed during cleanup.
* The Applicant Flags page displayed the temporary no-show flag with the expected applicant, email, reason, and year. The flag was then deleted successfully; a fresh view confirmed the QA flag list returned to zero.
* A second isolated public application was submitted after the first QA applicant was accepted against a configured one-attendee capacity with waitlisting enabled. It remained a normal Submitted application instead of being placed on the waitlist. This confirms the Hostinger JSON-deserialization defect prevents capacity/waitlist configuration from being enforced; it is a launch blocker.
* The deployed confirmation page still promises an email, describes committee scoring and possible interviews, and does not disclose waitlist placement. It is an old build and does not contain the current source correction for the removed Interview workflow or accurate delivery/status language.
* The CSV export completed and contained the isolated application, participant, guest, commander, T-shirt, and check-in data. It also incorrectly split serialized empty form data into `Form: 0` and `Form: 1` columns containing `{` and `}`, confirming the application-data JSON normalization blocker affects exports.
* The Excel export completed; its `.xls` file is HTML table content intended for spreadsheet opening rather than a native Excel workbook. The printable PDF report control completed and opened the browser print/report view. The exports cannot be fully accepted until configuration and application JSON are normalized and a scored application can be exercised.
* The Hostinger root URL returns HTTP 200 and the application shell, but the automated browser did not render the Home page and fell back to a blank document. It is not the requested Chamber Apps Hub: the deployment title is “FMWF Chamber Application Management System” and the HTML contains no Corporate Cup/application hub content. Qaisar must either deploy the completed `handoff/apps-hub/index.html` at the dedicated apps subdomain or explicitly state that the root route of the final permanent host will serve the Apps Hub and the application will live below it. This is a launch dependency, not an application-workflow defect.
* Help & Guidance is accessible from the sidebar. The 12-step Guided Tour loaded, started, showed accurate manual-allocation guidance, exposed sequential navigation, and includes direct workflow links. It should remain in the permanent platform as the Chamber’s staff onboarding reference; its content must be retained during Qaisar’s re-deployment.
* The Help Center’s “Demo & Testing Guide” opens an older `/demo-guide` page branded “Demo Mode.” Its instructions use stale navigation (“View Applications” tabs, settings/email template tabs inside Applications), say no-shows are automatically flagged, and describe applicant-phase Interview behavior. The page should **not** be removed; it should be renamed and retained as a staff-only “Feature Testing Guide,” with current navigation, manual no-show flagging, and all live workflow rules. The demo-only label and reviewer link should be removed or explicitly gated from the permanent site.
* The Hostinger public home page does render normally on retry. It is the application portal, not an Apps Hub. Its program cards are correctly hidden because the three Chamber programs are currently Draft. That is appropriate before launch, but the initial program forms/configurations must be verified and each program deliberately opened only when the Chamber approves its application window.
