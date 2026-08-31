# Subject: Required Hostinger fixes before FMWF Chamber domain cutover

Hi Qaisar,

Thank you for getting the FMWF Chamber Application Management Platform running on Hostinger. We independently tested the staging deployment against the Chamber-approved demonstration at `https://fmwfapps-j4ebl3f4.manus.space`.

The staging application has several workflows working correctly, including Chamber staff sign-in, secure reviewer links and assignment, applicant status checks, secure participant data persistence, Check-In, Undo, and optional No-Show flags. However, it is **not ready for Chamber DNS or launch yet** because Hostinger MySQL is returning program configuration and application form-data JSON as strings rather than usable objects. That causes Form Builder errors, settings/template values to reset on reload, custom form questions not to render, capacity/waitlist enforcement to fail, and exports to include corrupted form-data output.

I have attached a remediation package with the current verified source and the exact changes. Please apply it to the OptimizED-controlled GitHub repository, redeploy through the linked Hostinger Node application, and use the included acceptance list to test a new temporary QA program. The included audit brief identifies the test program and records that should then be removed.

Please keep the Hostinger URL as staging. Once the code passes the acceptance list, send us the exact Hostinger custom-domain DNS/verification values. After contract execution, we will have the Chamber’s DNS/web administrator map `applications.fmwfchamber.com` to the application and `apps.fmwfchamber.com` to the static Chamber Apps Hub. The Hub should connect the application platform, the verified Corporate Cup destination, and future Chamber tools.

Please preserve individual native Chamber staff accounts, account-free secure reviewer links, the Help Center, Guided Tour, and the new staff-only Feature Testing Guide. Do not use OAuth or a shared production administrator login. Also, please ensure OptimizED remains an owner/collaborator for GitHub, Hostinger, database, SMTP, and deployment logs, since the Chamber has selected ongoing maintenance.

Let me know when the staging redeployment and acceptance checklist are complete, and send the custom-domain values before we ask the Chamber for DNS support.

Thank you,

Rupak
