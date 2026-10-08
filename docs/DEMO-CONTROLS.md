# Demo controls

## Start a clean presentation

1. Sign in as Mo.
2. Expand **Demo controls** below Event zones.
3. Choose **Clear reports & incidents…**.
4. Read the confirmation, type **CLEAR**, then press **Clear reports & incidents**. Cancel closes the dialog without changing reports.

This permanently removes all reports, incidents and assignments and pauses active volunteer location sharing. It also clears simulated journeys and cached walking estimates. Accounts, sign-ins, zones, first-aid configuration, report ID sequence and cumulative API usage counts are retained. Volunteers press **Go available** again after reset. AI requests already sent cannot be refunded; late results cannot restore deleted reports. Page-local conversations in other tabs are separate; use **Clear chat** in those tabs if needed.

## Test without attendee GPS

On the main report form or an AI-prepared report draft, choose **Use demo location · fictional**. This uses a server-owned fictional point at -37.7992, 144.9620 near the University of Melbourne. It does not request attendee GPS and ignores supplied client coordinates. No fake accuracy or GPS capture time is recorded.

**Send report only** creates a mapped report without requesting a volunteer. **Send & request volunteer** also starts the normal assistance workflow. Volunteers still need an account and available status, and must accept; selecting a demo destination does not fabricate volunteer GPS or arrival. Mo can use the existing **Fictional movement demo** after an assignment is accepted to animate the dotted path. Human arrival and resolution remain explicit.

Demo locations are labelled in report names, staff map pin titles and assistance details. Public maps retain the same privacy rules: attendees see their own accepted request, a fixed volunteer starting point and progress, without moving volunteer coordinates. Google walking-estimate calls are disabled for demo destinations, even if live routing is configured. Regular GPS and zone selection retain their previous behavior.

## Verification — 8 October 2026

- **174/174 isolated automated tests passed**, with simulated AI/GPS/routing. New coverage checks both report buttons without GPS, server-owned coordinates despite forged input, labelled map projections, accepted assistance in all three roles, zero routing calls/reservations for demo destinations, reset access/CSRF, active sharing paused, settings/accounts/usage retained and report IDs not reused. [Test output](checks/demo-controls-tests.txt).
- Actual isolated browser with GPS deliberately denied submitted a demo report and a demo assistance request. Mo saw both labelled incident pins and the fictional destination. Reset confirmation was disabled for blank/lowercase input, enabled only for exact CLEAR; Cancel left both incidents present. The destructive API behavior was tested through isolated automated tests, not by deleting the real app's reports. [Confirmation](checks/demo-reset-confirmation.png).
- Live HTTPS page refreshed with the new demo choice. Page, session and public map returned 200; private `.env` and store paths returned 404. [Live report form](checks/demo-location-live.png).
- Local app restarted using the existing phone launcher and tunnel. Before/after saved accounts, reports, incident IDs, zones and first-aid settings matched; original API ledger IDs were retained and counters never reset. Routing usage unchanged. Jev attempts advanced from 19 to 20 during the live interval; the source of that concurrent attempt was not independently attributed. No live AI test was initiated by this verification, and no live routing call was made.

Physical-phone permission behavior is not established by the denied-GPS fixture. Real volunteers still require browser GPS for their availability; the new option supplies only a fictional incident destination. Live Google walking routing remains disabled pending setup.
