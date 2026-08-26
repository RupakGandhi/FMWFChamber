# Email to Qaisar

**Subject:** FMWF Chamber Application Management Platform — Complete Production Build and Deployment Package

Hi Qaisar,

The FMWF Chamber asked us to create a separate permanent Application Management Platform to replace the application, nomination, committee-review, scoring, communication, reporting, and event-registration work they have been managing through Submittable and manual processes. We built the full working platform, demonstrated it to the Chamber, incorporated their meeting and Military Appreciation Night feedback, and gave them a published version to test. They have selected the **Enterprise package** and are moving forward.

The complete benchmark they approved is here: **https://fmwfapps-j4ebl3f4.manus.space**. Please use it side by side with the enclosed source and acceptance checklist. We are not asking you to redesign the product. The permanent version needs to reproduce the demonstrated features and workflows, with production hosting, native staff accounts, Chamber content, email, domains, and live data.

The initial system supports three programs:

1. **Leadership FMWF** — configurable application, multiple reviewers, blind review, scoring criteria, deadlines, comments, score comparison, tabulation, ranking, status, archives, and exports.
2. **The Awards / Chamber Choice Awards** — nomination forms, account-free committee review, scoring, comparison, communication, annual records, and exports.
3. **Military Appreciation Night** — ticket requests and totals, threshold alerts, fully manual allocation, participant/commander forms, guests, T-shirts, pronunciation and service information, waitlist and promotion, check-in, Picked Up/Cancelled/No-Show/Undo, optional flags, and complete exports. It must never auto-approve or allocate tickets first-come-first-served.

The Chamber selected a **$12,000 Enterprise implementation** plus **$3,000 annual combined maintenance for Corporate Cup and this platform beginning January 1, 2027**. Because we are maintaining both systems, OptimizED needs permanent administrator and technical access to both production environments.

The package now uses **native Chamber-managed administrator accounts**, not OAuth. You will run the enclosed bootstrap script once to create the first administrator. Chamber staff can then create, reset, unlock, activate, and deactivate additional staff administrators inside the app. Reviewers remain account-free and receive secure assignment links. Applicants also remain account-free.

We know the Chamber wants these tools presented through its site as you handled for Corporate Cup. Please review the enclosed hosting decision document and recommend the best permanent architecture. Hosting on our Hostinger account may be appropriate if the plan supports a persistent Node 22/Express application, MySQL, environment secrets, HTTPS, backups, logs, and safe deployment. A Chamber-controlled capable host or the existing managed Manus project with Chamber custom domains are also acceptable if they preserve reliable service and permanent OptimizED access. Please do not assume a static or WordPress-only hosting plan can run this application.

We also want a reusable **Chamber Apps Hub**, recommended at `apps.fmwfchamber.com`, that links Corporate Cup, the Application Management Platform, and future Chamber applications. The application platform is recommended at `applications.fmwfchamber.com`; equivalent Chamber-controlled addresses are fine if we approve them before cutover.

Everything you need is in one ZIP. Start with `docs/final-handoff/qaisar/START_HERE_QAISAR.md`, then review the hosting decision, architecture, environment matrix, deployment runbook, database guide, administrator guide, benchmark and functionality matrix, launch checklist, replacement contract exhibits, Apps Hub, migrations, production-safe seed, native-admin bootstrap script, tests, and full source.

Please return your recommended hosting/access architecture before deploying. After approval, use a clean production database, apply all migrations through `0008`, create the first native administrator, seed the three programs as drafts, configure live Chamber email and domains, and complete the entire acceptance checklist. Return the final URLs, access record, backup and restore evidence, source checksum, acceptance results, and any unresolved issue to us before launch.

Thank you,

Dr. Britney Gandhi and Dr. Rupak Gandhi  
OptimizED Strategic Solutions, LLC
