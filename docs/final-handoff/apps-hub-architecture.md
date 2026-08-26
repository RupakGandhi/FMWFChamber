# FMWF Chamber Apps Hub and Domain Architecture

## Recommendation

Use **`apps.fmwfchamber.com`** for the Chamber-owned applications landing page. Do **not** use `optimizedapps.fmwfchamber.com` as the primary public name. A neutral Chamber-owned name is clearer to users, survives vendor or developer changes, and can accommodate future internal tools without rebranding.

The preferred production structure is:

| Public Address | Purpose | Deployment Boundary |
|---|---|---|
| `apps.fmwfchamber.com` | Branded applications hub and directory | Small static deployment, independently cacheable |
| `applications.fmwfchamber.com` | Application Management Platform for Leadership FMWF, The Awards, Military Appreciation Night, future configurable programs, and suitable hiring/application workflows | Full-stack React/Express/database application |
| `corporatecup.fmwfchamber.com` | Existing Corporate Cup Hub | Existing Corporate Cup deployment |

Sibling subdomains are preferred over putting independently deployed applications under paths such as `/corporate-cup` and `/applications`. Subdomains keep routing, authentication cookies, deployments, rollbacks, and security boundaries independent. The hub can still present each tool as one coherent Chamber experience.

## Hub Information Architecture

The initial hub should contain three application cards:

| Card | Public Copy | Destination |
|---|---|---|
| Program Applications | Apply for Leadership FMWF, submit nominations for The Awards, request Military Appreciation Night tickets, and check application status | `https://applications.fmwfchamber.com` |
| Corporate Cup | Access the Chamber’s custom Corporate Cup team hub and event workflow | `https://corporatecup.fmwfchamber.com` |
| Chamber Events | Browse official Chamber events and registration opportunities | `https://business.fmwfchamber.com/events` |

Future applications can be added as additional cards without altering either full-stack application. The hub should also include a restrained link back to the main Chamber website and a staff-only note that administrative access occurs inside the destination application rather than on the hub.

## Brand and Content Basis

The hub copy should reflect the Chamber’s public positioning:

> “Your Fargo Moorhead West Fargo Chamber is a catalyst for inclusive growth. We protect businesses, inspire individuals, cultivate communities and influence action.” — FMWF Chamber homepage.[1]

The Chamber’s official signature-events page identifies **The Awards**, **Corporate Cup**, and **Military Appreciation Night** as current signature/event programs.[2] The official 2026 Corporate Cup page describes the event as a team-development competition open to Chamber member businesses and confirms the official Chamber business-events domain.[3]

## DNS and TLS Plan

Qaisar should create CNAME or provider-required DNS records for the three subdomains only after each deployment has a stable production target. HTTPS must be active before any public cutover. The application’s production environment must use `https://applications.fmwfchamber.com` as its public base URL and OAuth origin/callback basis. SMTP links, reviewer tokens, participant links, copy-link controls, and status links should therefore resolve to that domain.

## Cutover Sequence

| Order | Action | Acceptance Evidence |
|---:|---|---|
| 1 | Deploy the Application Management Platform to a non-public production URL with a clean database | Health check, migrations, administrator login, and smoke tests pass |
| 2 | Deploy the static apps hub and Corporate Cup target | Each destination works from the temporary hub URL |
| 3 | Configure production environment values and exact OAuth URLs | Administrator login works without redirect or cookie errors |
| 4 | Create DNS records for all three subdomains | DNS resolves to the intended deployments |
| 5 | Confirm HTTPS certificates | All three URLs load with valid certificates and no mixed content |
| 6 | Run the full launch checklist | Submission, scoring, approval, participant form, check-in, waitlist, export, email, backup, and mobile tests pass |
| 7 | Add the apps-hub link to the main Chamber website | Public navigation is discoverable and verified |

## References

[1]: https://www.fmwfchamber.com/ "FMWF Chamber — Official Homepage"
[2]: https://www.fmwfchamber.com/signature-and-monthly-events/ "FMWF Chamber — Signature and Monthly Events"
[3]: https://business.fmwfchamber.com/events/details/corporate-cup-2026-1566773 "FMWF Chamber — Corporate Cup 2026"
