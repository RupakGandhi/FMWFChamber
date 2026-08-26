# Hosting and Ongoing Access Decision

## Required Outcome

The production application must run continuously under Chamber-facing domains while giving the Chamber operational control and preserving permanent OptimizED administrator and technical access for the selected combined maintenance service. Qaisar should select the architecture after confirming the available Hostinger plan and comparing it with the existing managed project.[1]

| Requirement | Non-Negotiable Result |
|---|---|
| Runtime | Node.js 22 application running the Express/tRPC server, not static files only |
| Database | MySQL-compatible production database with encrypted transport, backups, and restore capability |
| Secrets | Server-side environment-variable storage; no secrets committed to source or exposed to the browser |
| Domains | Stable Chamber-controlled HTTPS addresses or redirects |
| Access | Chamber administrator access plus permanent OptimizED administrator/developer access |
| Operations | Logs, restart/deployment process, database backup, restore drill, and rollback path |
| Authentication | Native Chamber-managed staff accounts; no staff OAuth dependency |

## Options for Qaisar to Evaluate

| Option | Use When | Advantages | Conditions/Risks |
|---|---|---|---|
| OptimizED Hostinger account | The subscribed plan supports Node 22 services, environment secrets, MySQL, HTTPS, logs, and safe restarts | Permanent OptimizED access and one maintenance environment | Verify that it is not static/WordPress-only hosting; document Chamber access, backups, and disaster recovery |
| Chamber-controlled capable host | The Chamber already has an appropriate Node/MySQL environment and will grant persistent OptimizED access | Chamber infrastructure ownership and direct DNS control | OptimizED access must survive staff turnover; do not deploy if required runtime/database controls are unavailable |
| Managed Manus hosting with Chamber domains | OptimizED and the Chamber prefer the existing verified managed runtime | Lowest code/runtime change from the published benchmark | Confirm long-term project ownership, administrator access, custom-domain binding, backup responsibilities, and service terms |

## Decision Record Qaisar Must Return

Qaisar must provide the chosen provider/account, application and database ownership, production and staging URLs, DNS targets, HTTPS status, backup location and retention, restore procedure, log access, deployment method, rollback method, Chamber administrator list, OptimizED administrator/developer list, and the person responsible for provider billing and renewal. No hosting decision is final until OptimizED approves that record.

## Recommended Domain Pattern

Use `apps.fmwfchamber.com` for the multi-application landing page and `applications.fmwfchamber.com` for the Application Management Platform. Link the existing Corporate Cup production address from the Apps Hub. Equivalent Chamber-controlled addresses are acceptable if approved before configuration.

## References

[1]: https://fmwfapps-j4ebl3f4.manus.space "Verified published Application Management Platform benchmark"

