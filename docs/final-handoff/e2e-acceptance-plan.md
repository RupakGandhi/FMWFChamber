# Data-Backed End-to-End Acceptance Plan

The isolated acceptance workflow will create uniquely named temporary programs, applications, reviewers, assignments, scores, participant data, check-in records, and waitlist records in the connected development database. It will then delete every temporary record in dependency order.

| Workflow | Acceptance Sequence |
|---|---|
| Scored application | Create open scored program → submit required application → assign two reviewers → submit scores from both token portals → edit one review → verify aggregate score, review count, and export score detail |
| Approval and participant form | Create open registration program → submit request → approve through admin status workflow → fetch secure participant context → submit T-shirt, attendee, pronunciation, commander, and guest data → verify duplicate protection and admin retrieval |
| Check-In | Mark approved request Picked Up → Undo to Awaiting → mark Cancelled → mark No-Show with notes → verify persistence after each change |
| Waitlist | Configure capacity one with manual promotion → approve first request → submit second request and verify waitlisted status → manually promote → verify accepted application and promoted waitlist record |
| Export | Query complete export after scores, participant form, check-in, and waitlist actions → verify each dataset contains the expected temporary records |

The workflow must not depend on real SMTP delivery. Temporary programs will have automated external email delivery disabled so the test verifies application state, link generation, persistence, scoring, and export behavior without contacting any person.
