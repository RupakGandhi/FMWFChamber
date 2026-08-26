# Chamber Apps Hub Deployment

Deploy `index.html` as a static site at **`https://apps.fmwfchamber.com`**. The file has no build step, JavaScript dependency, external image, or asset directory. It can be hosted by the Chamber's current web host, a static hosting service, or the same platform used for the other custom applications.

Before public launch, Qaisar must ensure that these two application destinations resolve over HTTPS:

| Hub Destination | Required Production Address |
|---|---|
| Program Applications | `https://applications.fmwfchamber.com` |
| Corporate Cup | `https://corporatecup.fmwfchamber.com` |

The third link already points to the official Chamber events calendar at `https://business.fmwfchamber.com/events`.

## Acceptance Checklist

Open the hub at 1440×900 and 390×844. Confirm that the three cards are visible, keyboard focus is clear, the skip link appears when focused, all links open the intended production address, the main Chamber link works, and no browser-console or mixed-content errors occur. Then add a prominent link to `https://apps.fmwfchamber.com` from the Chamber's main website.

## Pre-Handoff Verification

The standalone file was rendered locally in Chromium at 1440×1000 and 390×844 on August 25, 2026. The desktop layout presents a clear asymmetric hero and side-by-side primary application cards. The mobile layout stacks the hero, status guidance, and application cards without horizontal overflow; headings, body copy, and navigation remain legible and touch accessible. Qaisar must repeat link, keyboard, console, and HTTPS checks after the three production domains are live.
