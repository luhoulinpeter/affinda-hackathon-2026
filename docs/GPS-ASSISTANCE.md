# GPS assistance and volunteer offers

Implemented 7 October 2026 on the existing Node.js / plain JavaScript stack. All stations and demonstration incidents are fictional. Real-device GPS and HTTPS phone access must be verified separately from the simulated checks.

## Latest update: map, privacy and volunteer choice

The main report form has **Send report only** and **Send & request volunteer**. Only the latter requests attendance and requires GPS. Reports may optionally attach their location without requesting attendance. An AI safety draft remains unsubmitted until confirmation; the duplicate request shortcut in Q&A has been removed.

Available volunteers can choose an ordinary waiting incident or wait for Mo to send an offer. Accepting immediately assigns the chosen incident; the server prevents a second assignment or simultaneous winners. Paused/busy volunteers still see permitted incoming pins/cards. Details unlock for the assigned volunteer or Mo's chosen offer recipient.

The reporter can mark a report private; Jev also flags potential sensitivity in the existing classification call. Private, pending, failed and legacy privacy checks wait for Mo's review/personal assignment. Mo can approve ordinary volunteer selection or mark private with an audited reason. Ordinary urgent incidents remain visible to Mo and may be selected if eligible; urgency alone does not imply privacy.

Mo sees all incident pins and can open details. Volunteers see ordinary pins and their own private assignment, with unrelated details withheld. Staff maps show fresh shared volunteer locations. An attendee sees only their own accepted responder's fixed starting ping, destination and dotted progress, never moving volunteer coordinates. Decorative curves are not walking routes. Mo's labelled fictional journey demonstration never changes real GPS, arrival or resolution.

Mo can request an advisory ranking using **Suggest with AI** when eligible volunteers exist and free OpenRouter is available. The provider receives only category/urgency/zone and coarse candidate facts. It cannot send offers, invent qualifications or bypass eligibility. Changed incident/volunteer data invalidates the suggestion.

Actual Google loading, all three role browser scenarios and simulated API/client regression checks are recorded in [the MVP checklist](OVERNIGHT-MVP-PLAN.md#late-evening-verification--7-october). Physical-device GPS and multi-phone HTTPS remain unverified.

## Mo offers and continuous sharing

Mo can select any unresolved incident, including an ordinary report without GPS, choose an eligible volunteer under **Offer to a volunteer**, and click **Send volunteer offer**. This sends a 60-second offer, not an immediate assignment. Only acceptance assigns the helper. A manual decline/timeout returns the incident to Mo's review; Mo can choose a different helper. Self-assignment to the reporter, missing accounts, unavailable/busy/reserved volunteers, repeated candidates and resolved incidents are rejected on the server. History records Mo's offer. No requester GPS is invented for zone-only reports.

**Retry matching** applies to active requests with a confirmed requester GPS destination. Without it, Mo sees a disabled explanation and can offer manually. Retry switches to nearest matching and respects candidates already attempted. Reporting alone does not request attendance; an eligible volunteer may choose an ordinary incident or accept Mo's offer.

**Go available** shares GPS until the volunteer presses **Pause** or signs out, while the browser supplies valid updates. Finishing, withdrawing or replacing an assignment preserves that opt-in and returns an eligible volunteer to Available; they can accept another incident without starting sharing again. A volunteer who already paused stays paused. This 8 October user decision supersedes the earlier fixed ten-minute sharing session and completion-pauses-sharing behavior described historically below.

Uploads remain limited to one per ten seconds. Each valid fix renews a ten-minute stale-presence lease; there is no fixed ten-minute active-sharing cutoff. New fixes still require capture within 60 seconds and accuracy of 100 metres or better. Matching may use an older accepted position within that stale window, labelled with its age. The `fresh` flag and live map visibility still require a fix within 60 seconds. Invalid fixes, ten minutes without valid updates, session expiry or restart stop server availability. A paused or expired opt-in cannot be restarted by a delayed GPS callback; the volunteer must explicitly choose Go available again.

Pause stops local GPS collection immediately, even if its server request fails; the last server position then expires without updates. Accepted assignments remain visible for human follow-up, and expiry never resolves an incident. Browsers may suspend background GPS or timers, especially on locked phones. This does not promise native background tracking. No AI call is required for sharing.

Current verification: **157/157 automated tests pass** with simulated providers, positions and clocks. Coverage includes completion by all authorised roles, subsequent assignment without re-opt-in, cancellation/retry, valid updates beyond ten minutes, abandoned-location expiry, explicit Pause, delayed callbacks, sign-out and session ownership. An isolated actual-browser check created a report, had Mo offer it to Priya, accepted/arrived/resolved it, observed fresh GPS and Available afterward, self-accepted a second report without Go available, and paused successfully (zero shared volunteer pins). [Completion screenshot](checks/sharing-after-resolution.png), [Pause screenshot](checks/sharing-paused.png), [full test output](checks/continuous-sharing-tests.txt). GPS and AI were fictional; physical-device GPS remains unverified. Historical verification below describes earlier releases.

## Try the workflow

1. Mo creates volunteer accounts under **Volunteer accounts**. Roster entries alone cannot receive offers.
2. Each volunteer signs in on their own browser/device, opens **Volunteer assistance**, clicks **Go available**, and grants location permission. Keep the page open. An accurate GPS fix (100 metres or better) is required.
3. The requester opens **Ask Riverside**. **Find first aid** performs station lookup without creating a report. **Request a volunteer** opens a draft; an injury message screened by Jev also opens an unsubmitted draft.
4. Select a zone, check the original message and choose **Send & request volunteer** in the main report form. This shares the destination with the safety team. Private/unchecked reports wait for Mo to assign personally.
5. The nearest eligible volunteer receives an in-app offer with a server-based countdown. Acceptance identifies the responder; **Mark arrived** records a separate human action. Resolution still requires explicit confirmation.
6. Mo selects the incident to see the offer recipient, responder, offer history, destination and current volunteer GPS freshness. **Retry matching** ends the existing offer/assignment and tries another candidate. **Stop assistance** removes the destination and stops matching, leaving the incident open unless separately resolved.

No real volunteer credentials are seeded. The later map milestone seeds three clearly fictional first-aid stations around the University of Melbourne when no saved station configuration exists, under the user's explicit request to invent demo locations. Existing reports and saved station settings are preserved. Event-goers remain guests; optional event-goer accounts are separate work.

## Station setup

In Mo's **Fictional first-aid stations** panel, edit the seeded demo names, descriptions and latitude/longitude, or supply your own fictional placements. **Enable these fictional demo stations** controls public lookup. Save the configuration. Saved configurations are never overwritten by defaults; disabling stations makes lookup unavailable. These placements are not real first-aid facilities.

Station approval is independent of the general fictional event guide, which remains unapproved. Lookup shows straight-line GPS distance, not a walking route or arrival estimate. If location is denied, stale or inaccurate, list stations without identifying a nearest one. No AI call is needed for the button-based lookup.

## When Go available returns to green

Allowing the website to use location does not guarantee that the device can return a position. Read the message below the availability buttons: permission blocked, position unavailable, a 15-second timeout, or the measured accuracy exceeding 100 metres. The volunteer stays unavailable if no eligible position is obtained; do not weaken accuracy checks to make the button succeed.

On a Mac, check **System Settings → Privacy & Security → Location Services**, including permission for the browser/app in use. If the embedded browser keeps reporting position unavailable, try `http://127.0.0.1:8765/` in Safari or Chrome on the same computer and sign in there. Keep one volunteer page visible while testing. This is a troubleshooting step, not a verified cure for every device. [Apple Location Services guidance](https://support.apple.com/guide/mac-help/allow-apps-to-see-the-location-of-your-mac-mh35873/mac); [browser location error meanings](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError).

The button shows **Getting location…** while waiting and **Location sharing active** while this page is tracking. A stale paused-state refresh during the initial presence request no longer cancels successful tracking. Refreshing the page stops its old GPS watcher; opt in again to start tracking in that page.

## Server rules

- Deterministic distance ranking replaces the older proposed Jev volunteer-selection design. Jev screens messages and suggests category/urgency; OpenRouter summarises and answers permitted informational questions. Neither chooses or dispatches a responder.
- Eligibility: volunteer account exists, explicitly available, GPS no older than 60 seconds, accuracy no worse than 100 metres, valid staff session, no active assignment or pending offer, and not the requester. Distance ties use volunteer ID. Volunteers are general helpers; no medical qualification is implied.
- Reserve one pending offer per volunteer and incident. Accept/decline is synchronous and rechecks eligibility. Expired or repeated acceptance returns HTTP 409; another volunteer cannot accept the offer.
- Offer expiry after 60 seconds, decline, pause, sign-out or stale presence moves to the next candidate. Each volunteer is attempted only once per request, including Mo retries. If exhausted, keep the request open with **No volunteer available — awaiting Mo’s review**. A newly available volunteer does not silently restart an exhausted request; Mo explicitly retries.
- Accepted helpers are busy. Completing, withdrawing or replacing an assignment leaves the responder paused until they opt in again. Pausing/signing out does not falsely cancel an accepted assignment; Mo still sees who accepted it.
- Offer expiry does not escalate or resolve incidents. Existing urgent flags and danger/crowd-pressure rules remain independent of AI and matching.
- Browser uploads are throttled to at most one per 10 seconds. Hidden pages pause tracking and pending offers; returning requires opting in again. Closed/disconnected pages become stale within 60 seconds. No push notifications are implemented.
- Presence and current volunteer coordinates live only in memory. Restart clears them and withdraws pending offers. Accepted assignments remain recorded for human follow-up, with responders unavailable until they opt in again.
- Staff sign-in is independent per tab. A volunteer's active location sharing has one owning session; a second session cannot steal/pause it, and signing out of a non-owning tab does not stop it. See [tab sessions](TAB-SESSIONS.md).
- Request destinations are stored only while assistance is active. Cancellation or explicit incident resolution removes precise destination coordinates. Offer history contains states, IDs, times and approximate distance, never historical GPS tracks. Disabled/unavailable requests remain active until human action.
- Mo sees active positions; the offered/assigned volunteer sees that request's destination; other volunteers cannot. Requesters see assistance status and the accepted name, not volunteer GPS or competing offers. Structured GPS never enters AI prompts.

## API additions

All mutations use verified session/guest identity, same-origin JSON and CSRF protection. Existing role checks and request-size limits remain.

| Endpoint | Contract |
|---|---|
| `GET /api/stations` | Mo receives saved configuration; others receive enabled public fictional stations only. |
| `POST /api/stations` | Mo only: `{enabled, stations:[{name,description,latitude,longitude}]}`; up to 20 validated stations. |
| `POST /api/first-aid` | Optional `{position}`. Returns `outcome`, `answer`, source references and station list with approximate distance when GPS is usable. Creates no incident. |
| `POST /api/presence` | Volunteer only: `{available:true,position}` or `{available:false}`. Identity is server-derived. |
| `POST /api/reports` | Existing report fields plus optional `{requestAssistance:true,requestId,position}`. A bounded request ID prevents duplicate assistance submissions for the same requester. Replays return the original incident reference without new AI calls/offers. |
| `POST /api/incidents/:id/offers/:offerId` | Offered volunteer only: `{decision:"accept"|"decline"}`. |
| `POST /api/incidents/:id/assistance` | `{action:"arrive"|"withdraw"|"retry"}`; arrival by assigned volunteer, withdrawal by requester/Mo, retry by Mo. |
| `GET /api/state` | Adds server time, permitted presence and role-filtered assistance state/offers/events. Uses existing SSE change signals. |

A GPS position is `{latitude,longitude,accuracy,capturedAt}` with numeric coordinates/accuracy and browser timestamp in milliseconds. The server validates bounds, freshness and accuracy, and records receive time. It does not independently verify the physical truth of a browser's claimed coordinates.

Jev's fixed `intent` choices now include `first_aid_information`: a station-location question without a new injury or safety report. That outcome returns server station data directly, without OpenRouter. New injury messages still take the safety-draft route, with first-aid lookup available separately. Follow-up incident answers include permitted assistance state and accepted responder; no GPS coordinates are added to LLM sources.

## Verification

53 automated tests pass. Automated checks use temporary stores, fake clocks/locations and simulated AI, covering nearest selection, reservations, busy/self/missing-account exclusion, expiry/reoffer, stale/invalid GPS, permissions, concurrent acceptance, duplicate submission, cancellation, destination deletion, restart recovery and station lookup. Client regression checks also distinguish permission/unavailable/timeout errors, measured accuracy, hidden-page startup and stale refreshes during opt-in. The original workflow browser checks used an isolated simulated-GPS server and temporary authenticated accounts.

Real phone GPS requires a secure origin (HTTPS; localhost is only local to the device), browser permission and suitable accuracy. Hosting, background notifications, walking routes and medical advice are outside this implementation. Existing AI credit approvals and call limits are unchanged; no live AI call is required for these checks.

Browser verification on 7 October completed first-aid lookup → injury draft → confirmed request → offered → accepted → arrived → explicit resolution, plus Mo station saving and GPS-denial fallback. Public, volunteer and Mo layouts fit at 375px; desktop views fit at 1280px. Client unit checks cover 10-second upload throttling, pausing on hidden pages, manual opt-in on return and GPS arriving after identity changes. No live provider calls or real GPS collection were performed.
