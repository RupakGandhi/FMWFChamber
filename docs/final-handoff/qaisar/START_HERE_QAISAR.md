# Start Here, Qaisar

## Why This Project Exists

The Fargo Moorhead West Fargo Chamber asked OptimizED to create a permanent custom replacement for the application-management work they have handled through Submittable and related manual processes. The Chamber needs one system that staff can reuse year after year for public applications, nominations, registrations, committee review and scoring, applicant communications, recordkeeping, reporting, and event operations.

OptimizED built the enclosed full working platform, demonstrated it to the Chamber, incorporated the July 29 meeting feedback and later Military Appreciation Night feedback, and gave the Chamber a published version to test. The Chamber has now selected the **Enterprise package**. They are not asking for a new concept or a different user experience. The permanent production system must reproduce the demonstrated platform and its workflows, with only production configuration, hosting, accounts, domains, email, and final Chamber data substituted.[1]

> **Exact functional benchmark:** [https://fmwfapps-j4ebl3f4.manus.space](https://fmwfapps-j4ebl3f4.manus.space)

Use the published version side by side during deployment. If a production screen, workflow, setting, export, or mobile view differs materially from the benchmark or the enclosed acceptance checklist, stop and confirm the difference with OptimizED before changing the product.

## What the Chamber Selected

| Commercial Item | Selected Term |
|---|---|
| Implementation | Enterprise Application Management Platform |
| One-time price | **$12,000** |
| Initial program configurations | Leadership FMWF; The Awards / Chamber Choice Awards; Military Appreciation Night |
| Ongoing service | Combined maintenance for Corporate Cup and this Application Management Platform |
| Combined annual maintenance | **$3,000 per year beginning January 1, 2027** |
| Maintenance relationship | OptimizED must retain ongoing administrative and technical access to both platforms |
| Contract format | OptimizED’s standard agreement body plus the replacement Exhibit A and Exhibit B in this package |

The Chamber may create additional programs, events, application cycles, nominations, registrations, or hiring/application workflows through **Add New Program** when the new use fits the Platform’s existing form, scoring, review, status, communication, export, waitlist, and event structures. A materially different module, integration, or data model is additional scope.[2]

## The Three Initial Programs

### Leadership FMWF

This is a scored application workflow. Staff configure the application and scoring criteria, assign multiple reviewers, optionally use blind review, enforce a review deadline and low-score comments, compare reviewer results, tabulate averages and rankings, update applicant status, send editable messages, archive the cycle, and export complete records.

### The Awards / Chamber Choice Awards

This is a nomination and committee-review workflow. Staff configure nomination questions and award criteria, assign reviewers without requiring reviewer accounts, compare and export committee scores and comments, communicate status, and preserve annual archives.

### Military Appreciation Night

This is a registration and event-operations workflow. It must show requested ticket quantities and totals, alert staff at a configurable threshold, preserve **manual** allocation, avoid first-come approval, and allow staff to approve requests in the order that best fits available seating. Accepted requests receive a secure participant form for guest, T-shirt, pronunciation, commander, rank, branch, years-of-service, dietary/accessibility, and attendee information. Staff can manage a waitlist, promote entries, check in accepted attendees, distinguish **Picked Up**, **Cancelled**, and **No-Show**, undo mistakes, and optionally flag a no-contact No-Show for future review.

## Functional Scope to Verify

| Area | Required Production Behavior |
|---|---|
| Staff accounts | Chamber administrators create, activate/deactivate, reset, and unlock native staff accounts inside the Platform; initial temporary passwords must be changed |
| Reviewer access | Reviewers do not create accounts; they use unguessable assignment links issued by email or copied by staff |
| Applicants | Applicants do not create accounts; open programs provide public forms and confirmation-number status lookup |
| Program setup | Create, edit, open, close, archive, duplicate, and add new programs; configure forms, required fields, conditional logic, deadlines, scoring, email, and event settings |
| Review | Multiple reviewers, blind review, assignment/reassignment, configurable criteria, deadline and score-edit rules, mandatory low-score comments, progress, comparison, aggregation, and ranking |
| Communications | Editable program templates; Chamber-controlled SMTP; confirmation, reviewer assignment/reminder, and status messages; core workflows continue without SMTP |
| Military Night | Manual ticket allocation, totals/thresholds, participant/commander forms, T-shirt and guest data, waitlist, promotion, check-in, Cancelled/No-Show distinction, Undo, optional flags |
| Data | CSV, Excel, printable PDF, application PDF, annual archive viewer, participant, scoring, check-in, and waitlist records |
| Guidance | Working Guided Tour and Help Center that match the final production navigation |
| Mobile | Public form, reviewer portal, staff administration, check-in, waitlist, and exports remain usable at mobile widths |

## Authentication: No OAuth for Chamber Staff

The permanent system now uses **native Chamber-managed administrator accounts**. Do not require Chamber staff to create or use Manus, Google, Microsoft, or another external OAuth account.

Run `scripts/create-native-admin.mjs` once after migrations to create the first administrator. That administrator signs in at `/staff-login`, replaces the temporary password, and creates additional Chamber and OptimizED administrators under **System → Staff Accounts**. Passwords use salted scrypt hashes; failed sign-ins trigger timed lockout; administrators can unlock, reset, activate, or deactivate accounts; and password hashes never leave the server.

Reviewer access remains separate and account-free. Reviewer tokens are assignment-specific access credentials and must never be repurposed as staff administrator sessions.

## Hosting Decision: Evaluate, Do Not Assume

The Chamber expects the platforms to appear under Chamber-controlled web addresses, as Corporate Cup does. Because OptimizED is being retained for combined maintenance, OptimizED also needs permanent administrator and technical access to both platforms.

You should determine the most reliable production architecture after reviewing the enclosed `HOSTING_AND_ACCESS_DECISION.md` and the actual Hostinger plan available to OptimizED. The acceptable outcomes are:

1. **OptimizED-controlled Hostinger deployment**, if the plan supports a persistent Node 22/Express service, MySQL-compatible database, environment secrets, HTTPS, custom domains, backups, logs, and safe deployments;
2. **Chamber-controlled capable hosting**, with permanent OptimizED administrator/developer access and Chamber DNS pointing to it; or
3. **Managed Manus hosting with Chamber custom domains**, if OptimizED and the Chamber prefer to retain the current managed runtime.

A basic static or WordPress-only plan is not sufficient for this full-stack Node/MySQL application. The Chamber can point or redirect its chosen subdomain to the approved host, but the final public URL must remain stable and must be placed in `PUBLIC_APP_URL` before any reviewer or applicant email is sent.

## Recommended Public Structure

| Purpose | Recommended Address |
|---|---|
| Chamber Apps Hub | `https://apps.fmwfchamber.com` |
| Application Management Platform | `https://applications.fmwfchamber.com` |
| Corporate Cup | The existing production address, linked from the Apps Hub |

The Apps Hub is intentionally reusable. It should present Corporate Cup, Program Applications, and future Chamber applications from one Chamber-branded landing page.

## Your Required Sequence

First, choose and document the hosting architecture with OptimizED. Next, deploy a clean database, apply every migration through `0008`, create the first native administrator, seed the three programs as drafts, configure `PUBLIC_APP_URL`, connect the Chamber’s SMTP, and bind HTTPS domains. Then compare every functional area against the published benchmark, complete both database-backed acceptance suites, and work through the launch checklist with Chamber staff. Finally, deliver production URLs, access records, backup/restore evidence, source checksum, and the signed acceptance checklist to OptimizED.

Do not migrate demo applicants, reviewers, scores, or demo credentials into production. Do not open a program until the Chamber approves its live content and rules. Do not enable automatic approval or first-come ticket allocation for Military Appreciation Night.

## Definition of Done

The assignment is complete when the permanent platform matches the Chamber-approved benchmark, all three initial programs are correctly configured, Chamber and OptimizED native administrator accounts work, reviewer links work without accounts, live email and all critical workflows pass, the Apps Hub and final domains work over HTTPS, backups and restore are proven, mobile checks pass, and the launch checklist is signed.

## Contacts

| Role | Contact |
|---|---|
| OptimizED project leads | Dr. Britney Gandhi and Dr. Rupak Gandhi |
| Chamber business lead | Setareh Campion |
| Chamber contract/organizational lead | Nicole Meland |
| Chamber program support | Nicolette Bresnahan and Kolbie Kapaun, as designated by the Chamber |

## References

[1]: https://fmwfapps-j4ebl3f4.manus.space "Chamber-approved published Application Management Platform benchmark"
[2]: ../corrected-appendices/READY_TO_PASTE_APPENDICES.md "Replacement Exhibit A and Exhibit B for OptimizED’s standard contract"

