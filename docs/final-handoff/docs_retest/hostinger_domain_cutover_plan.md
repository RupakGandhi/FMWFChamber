# Chamber Custom Applications: Domain and Apps Hub Cutover Plan

## Decision

The current Hostinger address is a **staging address**, not a Chamber-facing production URL. The confirmed practical architecture is to keep the Node.js application on the OptimizED-managed Hostinger Business plan, retain agency administration for ongoing maintenance, and map Chamber-owned subdomains to the deployed applications after contract signature. This avoids requiring the Chamber’s existing PHP-only Hostinger package to host Node.js while maintaining a Chamber-branded public address.

> Do not ask the Chamber to create a website redirect before Qaisar supplies the exact destination/verification values from the Hostinger custom-domain screen. A DNS record is preferred for the applications; a redirect alone is not a substitute for correctly serving a Node.js app under its final hostname.

## Recommended Addresses

| Service | Recommended address | Hosting | Current state |
|---|---|---|---|
| Chamber Apps Hub | `https://apps.fmwfchamber.com` | Static `handoff/apps-hub/index.html` on Chamber web host or OptimizED Hostinger | Does not resolve; deploy after contract |
| Program Applications | `https://applications.fmwfchamber.com` | OptimizED Hostinger Node.js application | Does not resolve; map after current defects are fixed |
| Corporate Cup | `https://corporatecup.fmwfchamber.com` | Existing/future Corporate Cup app | Resolves but returns HTTP 404; Qaisar must confirm/fix final target before hub links are published |
| Staging only | `https://mediumvioletred-alpaca-519743.hostingersite.com` | OptimizED Hostinger Node.js application | Reachable; not launch-ready |

The name `apps.fmwfchamber.com` is preferable to `optimizedapps.fmwfchamber.com`: it is Chamber-owned, vendor-neutral, and can accommodate future tools without renaming. The Apps Hub is an entry page, not a redirect. It should show cards for Corporate Cup, Program Applications, and future Chamber tools.

## Post-Contract Procedure

1. **Qaisar first fixes and redeploys the blockers** in `hostinger_audit_notes.md`, then completes the acceptance checklist against the staging address.
2. **Qaisar configures custom domains in the OptimizED Hostinger panel** and supplies the exact CNAME, A, or verification record values required by Hostinger. He must not guess these values.
3. **The Chamber’s DNS administrator creates the requested records** for `applications` and, if the Apps Hub is hosted on OptimizED Hostinger, `apps`. If the main Chamber site’s provider controls DNS, the request should go to that provider’s support channel or the Chamber’s website administrator—not necessarily the person who handles event content.
4. **Qaisar deploys the Apps Hub** using `handoff/apps-hub/index.html`, updates its three destinations only after they have passed HTTPS checks, and makes the final `applications` URL the `PUBLIC_APP_URL` in the Node application.
5. **The Chamber website editor adds a “Custom Applications” or “Chamber Apps” navigation link** to `https://apps.fmwfchamber.com`. The Hub, not the whole Chamber site, links onward to individual tools.
6. **Qaisar verifies TLS/HTTPS, canonical-host redirects, browser console/network activity, and direct deep links** (`/staff-login`, `/status`, `/apply/:slug`, `/review/:token`, `/participant-form/:token`) under the final address.
7. **OptimizED retains organization-owner access** to the GitHub repository, Hostinger account, production database, SMTP configuration, and the Chamber’s relevant subdomain/DNS configuration. Qaisar may be a collaborator; the Chamber may retain domain ownership. No single vendor or contractor should be the sole owner.
8. **Rotate all passwords and revoke temporary access** that was shared during the deployment conversation. Create individual Hostinger, GitHub, database, and SMTP access for continuing administrators instead of shared credentials.

## Chamber-Facing Request After Qaisar Supplies DNS Values

> Following execution of the application platform agreement, we are ready to connect the Chamber-branded addresses for the new tools. Please create the DNS records supplied by our deployment team for `applications.fmwfchamber.com` and `apps.fmwfchamber.com`, or direct us to the appropriate website/DNS administrator. Once those records resolve, we will complete the HTTPS checks and send the final launch confirmation. No change to the primary Chamber website is required beyond adding the new “Chamber Apps” link after testing is complete.

## Evidence

The Hostinger staging application is currently served from `mediumvioletred-alpaca-519743.hostingersite.com`; the `applications` and `apps` subdomains did not resolve during the August 30, 2026 check, and `corporatecup.fmwfchamber.com` responded with an HTTP 404. The Chamber’s public Corporate Cup event page remains on GrowthZone. [1] [2]

## References

[1]: https://business.fmwfchamber.com/events/details/corporate-cup-2026-1566773 "FMWF Chamber Corporate Cup 2026 event page"
[2]: https://mediumvioletred-alpaca-519743.hostingersite.com/ "Hostinger staging application"
