# FMWF Chamber Administrator Guide

## How the Platform Is Organized

The left sidebar separates **Overview**, **Management**, **System**, and **Help & Guidance**. Programs is the starting point for program-specific work. Each program card provides direct access to Form Builder, Applications, Settings, Email Templates, and the public link.

Inside a program, the workflow tabs remain focused: **Form Builder** controls the public form and scoring criteria; **Applications** contains submissions and reviewer progress; **Check-In** and **Waitlist** appear for registration programs; and **Export** creates operational and committee reports. Settings and Email Templates remain at the program-management layer so they are not confused with submitted records.

## Recommended First Session

Open **Help & Guidance → Guided Tour** and complete the tour. Progress is saved in the browser. Use the searchable **Help Center** afterward for task-specific instructions. The tour teaches the feature map; this guide defines the operational controls staff must verify before opening a real program.

## Staff Sign-In and Account Management

Staff sign in at `/staff-login` using a Chamber-managed username and password. The first administrator is created during production deployment. That person must replace the temporary password and then create separate accounts for each authorized Chamber staff member and designated OptimizED maintenance administrator under **System → Staff Accounts**. Do not share one staff account.

When creating or resetting an account, the temporary password appears once. Copy it through an approved secure channel. The recipient must replace it after sign-in. Passwords must contain 12-128 characters with uppercase, lowercase, number, and special characters.

After five invalid attempts, the account is temporarily locked. An active administrator can unlock it. Administrators can also reset a password or deactivate an account immediately when staff access should end. A user cannot deactivate their own account, and the system protects the final active administrator.

Reviewers do not belong in Staff Accounts. They continue to use their unique assignment links without creating usernames or passwords.

## Program Lifecycle

| Stage | Staff Action | Control Point |
|---|---|---|
| Draft | Create or seed the program; build form and scoring; set dates and emails | Public submissions are not accepted |
| Open | Confirm final deadline and public link, then change status to Open | Server accepts valid submissions until the deadline |
| Review | Assign reviewers and monitor progress | Score rules, blind review, comments, and deadlines are enforced per program |
| Decision | Change applicant status manually | Registration approval creates a secure Participant Form link when enabled |
| Event operations | Manage waitlist, participant data, Check-In, T-shirts, cancellations, and no-shows | Ticket allocation remains manual |
| Archive | Create the annual historical snapshot after operations close | Archive is view-only history, not a database restore |

## Creating Additional Programs

Staff may create additional events, applications, nominations, or hiring/application workflows using the existing configurable program structures. Use the general Custom program type when the workflow does not match Leadership, Awards, or Registration exactly. Configure the form, scoring, reviewers, emails, and settings before opening it.

Creating another configured program does not require developer work. Ask OptimizED to review a request when it needs a new integration, new module, materially different data relationship, custom migration, or workflow that existing controls cannot represent.

## Form Builder and Scoring

Form Builder controls public questions, field order, required fields, choices, help text, and conditional rules. Scoring Criteria defines what reviewers score and each criterion’s maximum value. For review programs, Settings controls blind review, maximum reviewers, review deadline enforcement, score editing, and mandatory comments below the configured threshold.

Before opening a program, submit one valid and one intentionally invalid test form. For scoring, assign two test reviewers and verify that the score comparison and aggregate match the individual submissions.

## Applications and Decisions

Applications is the operating list for submitted records. Staff can filter, select, assign or reassign multiple reviewers, open a full application, inspect each score and comment, change status, copy a secure Participant Form link for an accepted registration, and export the selected data.

No applicant is automatically accepted. Status changes are deliberate staff decisions. For Military Night, do not interpret waitlist position or submission time as ticket entitlement.

## Reviewer Management

Add a reviewer using name and email. The system creates a unique access token; the reviewer does not create an account. Assign more than one reviewer to an application when required. Staff can resend access, remove an assignment, reassign it, or complete bulk actions.

Reviewer email depends on SMTP. If email is unavailable, copy and securely send the reviewer’s access link. Never publish a reviewer token publicly.

## Military Night Ticket and Participant Workflow

The Applications list and ticket dashboard display requested ticket quantities. The threshold alert informs staff that the configured number has been reached; it does not accept or deny anyone. Staff retain full control to fulfill requests in any order that fits available sections or ticket quantities.

When staff accept a request, the system can send or copy the secure Participant Form. The form captures T-shirt sizes, guests, pronunciation, dietary/accessibility needs, commander status, rank, branch, years of service, and attendee relationships. Staff view this information on the application detail page or include it in Export.

## Waitlist and Promotion

Capacity-based waitlisting compares new requests with **accepted allocation**, not submission count. Staff may manually promote an appropriate request. The optional automatic next-person setting is separate and should remain off for Military Night unless the Chamber intentionally changes its policy.

Promotion updates application status and can send the configured status email with a Participant Form link. Verify SMTP before relying on automated delivery.

## Check-In, Cancellation, No-Show, and Flags

Only accepted applications appear in Check-In. **Picked Up** records fulfillment. **Cancelled** means the person informed the Chamber and does not trigger a flag. **No-Show** means the person did not arrive without notice and may prompt staff to create a future-eligibility flag. Staff decide whether to flag; the system does not automatically restrict every no-show. Use **Undo** to correct an accidental selection.

Applicant Flags remains a separate manual record system for cross-year warnings, repeated no-shows, or restrictions. Staff should include factual notes and follow the Chamber’s approved eligibility policy.

## Email Configuration and Templates

System Email Configuration connects the Chamber’s SMTP provider. Program Email Templates control confirmation, reviewer assignment, reviewer reminder, and status messages. Core records still work without SMTP, but messages are not guaranteed until the connection and recipient delivery have been tested.

When staff turnover occurs, update the SMTP account, From/Reply-To information, administrator access, and recovery contacts. The stored SMTP password is encrypted. After a server-secret rotation or database move, re-enter and retest it.

## Export and Records

Export can produce CSV, Excel, and printable PDF. Staff choose which datasets to include: applications and form responses, rankings, each reviewer’s criteria scores and comments, participant/commander/attendee/T-shirt data, check-in, and waitlist.

Annual archives support historical viewing. Database backups support disaster recovery. These are different tools; creating an archive does not replace the backup schedule.

## Before Opening Any Program

Use the program card to review Form Builder, Scoring Criteria, Settings, Email Templates, Applications, and Export. Confirm the public deadline, required questions, score rules, reviewer roster, sender identity, confirmation wording, public link, mobile layout, and one complete test workflow. Then remove test records and change status to Open.

## Getting Help

Use Guided Tour and Help Center first for routine tasks. Report a reproducible defect with the program name, application number when appropriate, exact steps, expected result, actual result, date/time, browser/device, and screenshot with personal information removed. Submit feature requests separately so OptimizED can determine whether they fit the Combined Maintenance Package or require a change order.
