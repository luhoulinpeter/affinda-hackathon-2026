# Riverside map MVP: criteria and overnight plan

Prepared 7 October and final checks saved just after midnight 8 October 2026, Melbourne time. **Browser MVP implemented and verified within the explicit limits below; all requested behaviour decisions are answered.** This document records requirements, tests and limitations; implementation alone is not proof that a feature passes.

## Confirmed decisions and current continuation — late evening

- Google Maps key is saved in the ignored `.env`. Actual Google Maps loaded around the University of Melbourne with all three fictional station markers, attribution and zoom controls in an isolated browser preview. No inference was enabled in that preview.
- Event-goers see only their own assigned volunteer's **frozen starting ping**, their own destination pin and a dotted decorative connection. Grey dots gain white fill as remaining distance decreases. Moving volunteer coordinates and general volunteer discovery stay staff-only. Mo and volunteers also see the connection; staff retain permitted moving pins.
- Newly available volunteers can choose an eligible ordinary incident or wait for Mo's offer. Busy volunteers continue receiving permitted new pins/cards but cannot accept a second incident. Details unlock for the assigned volunteer; chosen recipients of Mo's offer retain the details needed to accept.
- Reports can be marked private by the reporter, using “Private report — the safety lead assigns a volunteer” rather than assuming attendees know Mo. Jev also flags potential sensitivity in its existing classification call. Sensitive or unchecked reports are held for Mo's personal assignment. Mo can explicitly review and mark an incident ordinary/private; a late AI result cannot override that decision.
- Fake movement is explicitly approved. Mo can start/stop a labelled 90-second fictional journey on an accepted assignment. Both endpoints are fixed fictional University-area positions; the simulation never changes arrival/resolution and never rewrites actual GPS.
- The request-volunteer button belongs in the main report form. Two submit choices explain the difference: “Send report only” and “Send & request volunteer.” The Q&A duplicate request shortcut is removed. AI-generated safety drafts remain unsubmitted until confirmation.
- Mo's on-demand AI ranking uses free OpenRouter with coarse distance bands, roster zone and location freshness; it never sends an offer. Candidate eligibility is rechecked after inference and again when Mo sends an offer. No medical qualifications are invented.
- Another user chat owns concurrent improvements to Mo assignment. Preserve its edits; do not overwrite or restart its development server.
- **Reminder changed by the user to 5:00am Thursday 8 October, Melbourne time** after a usage reset. The existing one-time heartbeat remains active under ID `resume-riverside-mvp-at-1am` (the ID was preserved; its name/time now say 5am). The user reports the next reset around 4:30am. Keep the Mac awake and Codex open. Earlier 1am mentions below are historical.
- Verification: the final full suite passed **143/143**, including the independently reproduced/fixed legacy privacy gap. Reports without a privacy decision now wait for Mo; explicit review/manual assignment remain usable. Actual Google loading and three-role browser walkthroughs passed. One additional live call per provider checked sensitivity/ranking successfully; see the evidence below. Physical-device GPS remains unverified.

Implementation and verification are complete for this browser MVP within the recorded limits. The disposable browser tabs/server are closed; the other chat’s development server was left running. No behaviour questions remain unanswered.

## Latest user instructions

- Build an Uber-like, map-led MVP on the existing project.
- Integrate Google Maps and live location pins.
- Keep three workspaces: event-goer, Volunteer and Mo.
- Mo sees all volunteers and incident pins, and can tap an incident for details.
- Map centre: around the University of Melbourne, Parkville. First-aid station coordinates will be fictional demo placements, not claims about real facilities.
- Volunteers see ordinary incident pins without opening unrelated details; chosen recipients of Mo’s offers and assigned volunteers may read their incident details. Sensitive/unchecked incidents are held for Mo and hidden from unrelated volunteers.
- Event-goers see fictional first-aid stations and their own accepted responder’s frozen starting ping, destination and progress, with no moving volunteer coordinates or general volunteer discovery.
- Use a decorative Bezier curve, grey with a white progress overlay tied to the volunteer's remaining distance. It is an approximate visual connection, not a walking route or evidence the responder walked that path. Mo and volunteers see permitted movement; event-goers see only their own frozen-start/progress variant.
- Invent first-aid station locations and clearly identify them as fictional demo data. This supersedes the earlier requirement for team-supplied coordinates; preserve existing station configuration rather than overwriting it.
- This milestone is a browser MVP. Do not spend the milestone implementing native background location. Real location updates still depend on the browser delivering them; never label an old or simulated location as live.
- Useful live testing may consume existing prepaid Jev credits. This supersedes the prior five-call/per-test approval restriction. OpenRouter must remain free, confirmed in the latest reply. No new purchases, recharge or additional paid services are authorised.
- Mo must see all incidents. Priya must continue seeing new incident pins while busy with another assignment. A volunteer becoming available can choose eligible waiting work or wait for Mo’s offer.
- If blocked, record the blocker and continue other approved tasks.
- A one-time continuation is scheduled in this chat for 5am Thursday 8 October 2026, Melbourne time; automation ID `resume-riverside-mvp-at-1am`. A scheduled run does not guarantee account usage has reset.

## Clarifications resolved

All three behaviour questions are answered in the confirmed decisions above. Event-goers remain guests; staff use existing accounts. Simulation is clearly labelled alongside real GPS. Public volunteer discovery is removed. No further user preparation is needed for the local map demo; physical-phone checks can happen later.

## Current foundation, inspected in code and notes

- Node.js server, plain browser JavaScript/CSS; no framework migration needed.
- Existing staff accounts, independent tab sessions and server-enforced role checks.
- Incident intake, human resolution, Jev analysis and OpenRouter summaries/Q&A.
- GPS opt-in and throttled updates; nearest eligible volunteer offers, accept/decline, arrival, cancellation and explicit resolution.
- Configurable fictional first-aid stations and first-aid lookup.
- The new `/api/map-data` response gives staff minimal incident pins and fresh volunteer positions, with no report text, history, offer ledger or sessions. Public guests receive enabled fictional stations and only their own accepted assignment’s fixed endpoints/progress. Existing `/api/state` detail permissions remain enforced.
- Existing reports without coordinates cannot truthfully receive exact map pins. They need an unlocated list/zone indication until a user supplies a location.
- PROJECT.md records the earlier milestones; the latest browser, live-provider and automated evidence is recorded below.

## Acceptance checklist

Checked criteria are supported by the test files and browser evidence below. A checked conditional real-device criterion records the explicit limitation; it does not claim physical GPS was tested.

### Roles and access

- [x] Event-goer landing view works without staff credentials; staff sign-in enters the stored role's workspace.
- [x] Mo, Volunteer and event-goer tabs coexist, survive refresh as designed, and sign out independently.
- [x] Mo sees all volunteer roster entries; volunteers with current shared GPS have pins. Unavailable/stale/missing positions are labelled honestly.
- [x] Mo can tap any incident for full details. Volunteers see new incident pins even while busy; other incidents' pins do not open details. Offered/assigned detail access follows the confirmed policy.
- [x] Volunteer map visibility does not grant Mo-only account management, retry/reassignment or configuration controls.
- [x] Event-goers cannot retrieve other attendees' reports/destinations, staff-only details, competing offers or unassigned volunteer GPS through the API. Own-responder tracking uses fixed starting coordinates and progress only.
- [x] Volunteer sharing consent accurately identifies which roles can see current positions.

### Map, locations and presentation

- [x] A real Google Maps basemap loads with supported credentials, usable markers and attribution. A placeholder does not count as Google integration passing.
- [x] The main screen prioritises the map and clear request/assignment cards, with layouts usable on phone and desktop.
- [x] Event-goers see fictional first-aid station pins; general volunteer discovery is hidden. Location denial produces a clear fallback.
- [x] New incidents can attach a confirmed location using GPS or a deliberate map-pin choice; submitting without a location remains possible.
- [x] Unlocated incidents stay accessible in the incident list; do not invent precise locations for real reports.
- [x] Fictional station names/coordinates are repeatable, visibly labelled, editable by Mo and do not overwrite existing configured data.
- [x] New accepted GPS updates appear in the permitted views without reload. Target: within 15 seconds in the foreground demo, measured under test rather than assumed.
- [x] Markers move smoothly between measured fixes without pretending interpolation supplies additional GPS measurements.
- [x] Location age and unavailable/stale states remain clear. Keep current validation; no native background tracking work in this milestone.
- [x] Missing/bad Google credentials, denied GPS, disconnects and empty results produce understandable messages; the existing report/assignment workflow remains usable.

### Assignment and tracking

- [x] Confirmed request → one eligible nearest offer → accept/decline → en route → arrived → explicit human resolution completes across three role views.
- [x] On acceptance, requester sees the permitted responder identity/status; moving responder coordinates remain staff-only. Busy status must not remove an explicitly permitted own-responder tracking view.
- [x] Mo and authorised volunteers see the Bezier connection update with movement. A grey curve gains a white overlay as remaining distance decreases relative to acceptance; the public variant retains fixed endpoints.
- [x] The visual handles initial zero distance, movement away, GPS jitter, reconnect and reassignment without invalid values or invented arrival. Explicit arrival and resolution remain human actions.
- [x] Approximate connection is labelled appropriately; no fabricated walking route, distance precision or arrival time.
- [x] Expiry, decline, duplicate submission, double acceptance, no volunteers, cancellation and reassignment retain server-enforced correctness.
- [x] Cancellation/resolution removes public tracking and precise destination data according to the agreed visibility policy.
- [x] Reconnect/refresh does not invent acceptance/arrival, duplicate assignments or automatically resolve incidents.

### AI and regression checks

- [x] Existing reports, urgency signals, original text, Q&A sources and explicit safety draft confirmation still work.
- [x] AI cannot dispatch, change roles or confirm resolution. Map updates do not trigger inference.
- [x] Full automated suite passes with simulated providers/GPS in temporary stores; no weakening checks to obtain a pass.
- [x] Browser walkthrough uses separate role sessions and a simulated volunteer path, explicitly labelled as simulation.
- [x] Phone-width and desktop layouts are inspected, including map interaction, incident details and tracking cards.
- [x] Live Google Maps loading and live Jev/OpenRouter checks are recorded separately from simulation, with provider/model, call counts, errors and known/unknown cost.
- [x] Real-device GPS and multi-phone HTTPS access are tested if available; otherwise explicitly marked unverified.
- [x] Final handoff names completed criteria, failing/unverified criteria, trial steps and blockers. Keep the AI-tools disclosure record current.

## Step-by-step implementation plan

1. **Establish a baseline.** Inspect git changes and preserve teammate work. Run the current simulated test suite. Record approved answers and testing authority; inspect actual balances/recharge settings read-only before expanding live use. Save a checkpoint when permitted.
2. **Prepare maps and demo data.** Add Google Maps configuration/loading and a contained map component. Add clearly fictional stations around the approved centre, preserving existing configuration. Keep a useful fallback while credentials are missing.
3. **Implement map data and role permissions.** Add minimal server-filtered map responses for staff. Hide general public volunteer positions; resolve own-responder exposure before implementing it. Add incident location capture without breaking reports that lack GPS. Test permissions before exposing pins.
4. **Build the three map views.** Add volunteer/first-aid/incident markers, tap-for-details cards, availability/status indicators and the agreed sharing notices. Preserve reporting, Q&A and staff account controls.
5. **Connect assignment tracking and waiting work.** Reuse the current workflow, adding the confirmed way for newly available volunteers to accept waiting incidents. Show moving responder pins and the grey/white Bezier connection in permitted views; handle decline, expiry, unavailable positions, cancellation and resolution.
6. **Verify behaviour and presentation.** Run focused automated checks and the full simulated suite. Walk through three simultaneous role sessions and phone/desktop layouts. Use isolated labelled movement scenarios; preserve real account/report data.
7. **Run useful live checks and finish the handoff.** Verify actual Maps loading when configured, representative AI responses and real GPS if available. Record measured results and call usage, stop unnecessary repetition, save checkpoints and update PROJECT.md plus this checklist.

Keep the existing stack and human incident workflow. Native phone background tracking, app-store packaging, payment integration, voice additions and unrelated rewrites are outside this milestone. Do not publish or introduce new paid services without user authority.

## What the user can prepare before sleeping

- All behaviour questions have been answered.
- The University-area centre and local Maps key are already configured; actual Google loading passed. Google's current documentation offers a no-cost Maps Demo Key for supported prototype features, or a standard Maps JavaScript API key with billing. Check compatibility; do not promise all features work with a demo key. Configure credentials locally instead of pasting them into chat. Restrict standard browser keys to intended websites/APIs. Browser map keys are delivered to the browser; provider AI secrets remain server-only.
- If using standard Google billing, choose a separate Maps spending allowance; AI prepaid-credit permission does not authorise Google charges. Do not enable billing on the user's behalf without approval.
- Keep the Mac powered, awake, connected to the internet, with Codex open and the project available. No account passwords need to be shared in chat.
- A phone and browser location permission will be useful later for real GPS verification. They are not prerequisites for implementing and simulating the workflow.

## Blocker policy and resumption

- Missing Maps credentials: continue server permissions, UI, marker/line behaviour under a simulated map adapter and regression tests; real Google loading remains unchecked.
- Missing venue decision or role-policy approval: continue independent approved work; do not silently decide those product requirements.
- AI rate limits/balance uncertainty/provider outage: continue simulated map/workflow tests and record live AI as unverified. Do not bypass spending guards or repeatedly retry exhausted accounts.
- Codex usage limits: save state before stopping where possible; the scheduled 5am continuation reads this checklist and latest user decisions.
- Record files changed, checks actually run, failures and the next independent task after each milestone. Do not stop all work because one integration requires user input.

## Sources checked while planning

- [Google Maps JavaScript API setup](https://developers.google.com/maps/documentation/javascript/get-api-key) — demo key versus standard billing-enabled setup.
- [Official scheduled-task documentation](https://learn.chatgpt.com/docs/automations?surface=app) — continuation in an existing chat and local-machine requirements.

## Scenario test matrix requested by the user

These scenarios are covered by isolated server/client tests and the three-role browser walkthrough below. Physical location acquisition is explicitly unverified; all injected GPS and movement scenarios use fictional positions.

| Scenario | Expected result |
|---|---|
| Event-goer submits an incident | Mo gets the incident without refresh; volunteers get a permitted pin, not the private report body. Reporter gets their own receipt/status. |
| Priya accepts incident A, then incident B is reported | A stays assigned; B's pin appears for Priya and Mo. Priya does not get a second simultaneous assignment. |
| Incident waits with all volunteers unavailable | Mo sees unresolved waiting work; no fake assignment or automatic closure. |
| A new volunteer becomes available with fresh GPS | They can receive/accept eligible waiting work using the user's chosen mechanism, without needing Mo to revive the incident. |
| Two volunteers try accepting the same incident | Exactly one wins; the other gets a clear stale/already-assigned result. |
| One volunteer tries accepting two incidents | One active assignment only, including concurrent requests. |
| A volunteer is unavailable or their GPS is stale | Acceptance is rejected; an old pin cannot establish eligibility. |
| Offer is declined or expires | Next eligible candidate can act, with no duplicate assignment or accidental closure. |
| A declined volunteer toggles availability | Do not silently replay a declined offer endlessly; behaviour must be defined and bounded. |
| Event-goer cancels while an offer is pending | Offer becomes unusable; no late acceptance or stale tracking. |
| Mo reassigns while the original volunteer accepts | Server chooses one valid final assignment; all views converge. |
| New incidents arrive while staff views are open | Mo receives all; busy/available/paused volunteer views retain permitted pin visibility. |
| Volunteer attempts to fetch other incident details directly | Server denies/redacts private content even if a client bypasses the disabled pin. |
| Event-goer queries map/state/Q&A directly | No other attendees' incidents/destinations, volunteer discovery GPS or staff data leak through alternate endpoints or sources. |
| Assigned volunteer approaches, moves away or loses GPS | Grey/white progress remains finite and honest; no automatic arrived/resolved state; stale location is labelled. |
| Reporter/volunteer/Mo refresh or reconnect | Permitted state restores without duplicate reports/offers or role changes. |
| Priya signs out in one tab while Mo remains signed in | Roles remain independent; old GPS sharing/session actions obey ownership rules. |
| Resolution/cancellation/reassignment occurs | Old destination/tracking access is removed appropriately and old offers cannot be used. |
| Google key absent/invalid or demo quota reached | Map failure is visible; report/assignment/incident list remains usable. |
| AI disabled, times out or returns malformed results | Original report still reaches its human workflow; maps and acceptance remain independent of AI. |
| Report has no GPS or map position | Incident remains in Mo's list and a clear unlocated bucket; no invented precise pin. |
| Phone and desktop layouts | Map, markers, offer controls and detail cards remain usable without obscuring required actions. |

## Goal and iteration rule

An active goal tracks completion of the approved map MVP and this checklist. Build a small slice, run relevant simulated checks, inspect all three role views, fix meaningful failures, then save evidence and move to the next slice. Stop repeating checks when they pass unless code changes or a new concern justifies rerunning them. If the same attempted fix fails twice, reconsider the approach. Do not spend credits simply to exhaust the balance. Missing Google credentials block only real map loading, not independent implementation/testing. The 5am continuation reads the latest answers and saved state.

## Maps credential preparation

The user saved `GOOGLE_MAPS_API_KEY` in the ignored local `.env`; actual Google loading, controls and markers passed in the disposable preview. `.env.example` contains only a placeholder. The server supplies the browser Maps key through `/api/maps-config`; AI keys remain server-only. The steps below are for replacing the key, not an outstanding task.

1. Open [Google's Maps Demo Key page](https://developers.google.com/maps/documentation/javascript/demo-key).
2. Click **Get a Demo Key**, sign in to Google and accept the displayed terms yourself.
3. Copy the resulting key and paste it immediately after `GOOGLE_MAPS_API_KEY=` in the local `.env`. Save the file; do not paste or commit the key in chat/Git.
4. Start/restart with `node --env-file=.env server/index.cjs` when ready to try the integration. Restarting requires staff to sign in again. Do not interrupt someone else's active development server without coordinating.

Google documents no billing details required for the demo key, marker/shape support and usage pausing at the daily limit without charges. Runtime loading has been verified with the saved key; this check does not establish a production quota or billing configuration. Keep it as a demo key; no billing upgrade is authorised.

## Historical map foundation verification — 7 October, evening

- Implemented Google loader with missing-key/error fallback, nonce-based Google style support, three role-specific map headings, station cards/pins, staff volunteer/incident pins, Mo selection into existing details, non-clickable volunteer incident pins and decorative grey/white progress curves. Map data/refresh is independent of AI.
- Three fictional University-area first-aid stations seed only when no saved station configuration exists. Saved/enabled/disabled operator settings are preserved.
- Acceptance records initial distance without storing a GPS track. Public state strips that added distance; public map has no incident/volunteer positions while the public-tracking decision is pending.
- `npm test`: **71/71 passing** across the combined current worktree. New map checks cover minimal data projection, public isolation, busy Priya receiving new incident pins, Mo seeing all incidents, cancellation/stale GPS removing positions, saved stations, credential separation, curve edge cases, simulated Google rendering, click permissions, identity-change/late-response suppression and transient data-error recovery.
- Browser checks used a temporary server/store with AI disabled: concurrent attendee/Mo/Priya views, a report arriving in Mo's queue and both staff map counts without reload, private report text absent in Priya's view, and staff map clearing on sign-out. No real GPS or inference collected.
- Layout checks verified DOM width equals viewport width at 375px for public, Priya and Mo, and at 1280px for Mo. Screenshot: [phone fallback](checks/map-fallback-phone.png). These checks concern the no-key layout; real Google controls/markers still need browser verification.
- First preview sign-ins fell back to guest on `127.0.0.1`; moving the disposable preview to `localhost` allowed the three roles to remain independent. Cookies are hostname-scoped across ports, so avoid running stores with different signing secrets against the same browser hostname. No authentication restriction was weakened. Exact source of the other hostname's cookie interference was not traced.
- Other concurrent workspace edits added manual Mo offers and ten-minute availability sharing during this turn. They were preserved and included in the passing full suite; this map milestone does not claim authorship or independent browser verification of those changes. The temporary preview used the server version loaded at its launch, while static files could change during inspection.
- Temporary preview tabs and server are closed. No live provider calls were used; existing private API flags, keys, call ledgers and allowances were not reset.

The outstanding list at the foundation checkpoint is superseded by the late-evening evidence below. The earlier 71-test run and no-key screenshots remain historical records.

## Late-evening verification — 7 October

Automated evidence: [saved full test output](checks/automated-tests.txt), `npm test` passed **143/143** in isolated temporary stores, using simulated AI, GPS and clocks. The first restricted-shell run could not bind localhost (`listen EPERM`); the permitted localhost run passed. No checks were weakened. Independent review reproduced a legacy privacy gap; the fix holds old two-field classifications from automatic offers, self-claim and unrelated map visibility until Mo reviews them. `sensitivity-legacy.test.cjs` plus rendered recommendations checks cover migration, holds, withdrawal and explicit Mo review/manual assignment. Two old fixtures were updated to the current three-field ordinary classification contract; validation was not weakened.

| Requirement / scenario | Authoritative evidence |
|---|---|
| Roles, independent sessions, refresh/logout, CSRF, direct endpoint/action permissions | `tests/server.test.cjs`, `tab-session.test.cjs`, `action-permissions.test.cjs`; concurrent browser attendee/Mo/Priya sessions |
| Main reporting form, separate attendance choice, optional GPS, private checkbox, retries/duplicate clicks, preserving text and late identity changes | `report-client.test.cjs`, `claims-http.test.cjs`, `demo-map-http.test.cjs`; browser receipt explicitly said no volunteer was requested |
| Mo sees all; busy Priya sees B while retaining A; unrelated report text remains private | `map-http.test.cjs`, `claims-http.test.cjs`; browser A/B walkthrough and measured incoming reports |
| Available volunteers choose ordinary work; paused/busy/stale/self/attempted/reserved candidates blocked; concurrent claims produce one assignment | `volunteer-claims.test.cjs`, `claims-http.test.cjs`, `claims-client.test.cjs`; browser Alex paused → available → self-accepted B |
| Reporter/AI private flags, uncertainty/outage held for Mo; explicit review; personal private offer → accept; late AI cannot undo Mo | `sensitivity.test.cjs`, `sensitivity-http.test.cjs`, recommendations client checks; browser private I-3 hidden from unrelated Priya and personally offered by Mo to Alex |
| Request → eligible nearest offer → accept/decline → arrive → human resolution; expiry/cancel/reassign/restart and destination removal | `assistance.test.cjs`, `assistance-http.test.cjs`, `action-permissions.test.cjs`; current browser manual/claim flows and earlier first-aid/request walkthrough |
| Public own fixed start/destination/progress only; staff permitted pins; minimal projections, no provider/session/history data | `map.test.cjs`, `map-http.test.cjs`, `demo-map-http.test.cjs`, `map-client.test.cjs`; public browser had no Sam moving marker while both staff maps did |
| Grey/white dotted Bezier progress, zero/away/jitter/stale/cancel cases, no automatic arrival/resolution | `map.test.cjs`, `map-client.test.cjs`, `demo-journeys.test.cjs`, `demo-map-http.test.cjs`; real Google rendered fixed circles/pin and dotted fill during the labelled simulation |
| Actual Google loading, attribution/zoom, keyboard-accessible station and Mo incident details; fictional editable repeatable defaults | Browser Google basemap/station popup/Mo I-2 selection; `map-http.test.cjs`, `map-client.test.cjs`, existing stations tests |
| No-key/authentication failure/disconnect/empty data fallback, GPS-denied report path | `map-client.test.cjs`, `map-http.test.cjs`, `report-client.test.cjs`, `gps-client.test.cjs`; earlier no-key/denied-GPS browser walkthrough |
| Optional ordinary-report GPS contributes distance bands; changed locations/incident urgency invalidate suggestions without auto-calls | `ranking-http.test.cjs`, `recommendations-client.test.cjs` |
| AI ranking is advisory, free-only, coarse fields only, strict candidate validation and revalidation, manual fallback | `ranking-provider.test.cjs`, `ranking-route.test.cjs`, `ranking-http.test.cjs`, `recommendations-client.test.cjs`; one live free ranking check below |
| Original report/urgency/Q&A/sources/confirmed drafts, provider failures/budgets, no AI dispatch/resolution/roles | Existing `incidents.test.cjs`, `ai.test.cjs`, `server.test.cjs`, `assistance-http.test.cjs`; all included in the full suite; earlier live Q&A/draft checks in AI-LIVE-CHECKS.md |

Browser data used only a disposable store, throwaway accounts, simulated classification and fictional locations. The preview loaded the real Google basemap with the saved key. The preview’s server was loaded before the final privacy/ranking fixes; those fixes are covered by current-code automated tests rather than claimed as live-preview checks.

Measured foreground refresh:

- A new ordinary report reached Mo’s queue in **296ms** and Priya’s minimal waiting list in **306ms**, with no page reload and Priya’s A assignment retained.
- One new fictional GPS fix was visible as Sam’s marker in Mo’s map within **7,061ms**, and Priya’s map within **7,066ms**, measured from the fixture’s capture timestamp. These are upper bounds including tool overhead; both meet the 15-second demo target. This is server/browser refresh evidence, not proof of physical-device GPS acquisition.
- Private I-3 did not appear on unrelated Priya’s map. Mo personally offered it to Alex, who accepted and could read its details.
- Alex explicitly marked B arrived and then confirmed resolved; the movement simulation never performed either action.
- Phone widths were checked at 375px for all three roles; Mo/Priya desktop at 1280px. Updated volunteer consent still fits at 375px with no horizontal overflow. Google station popup and Mo pin selection work with keyboard activation; the inspection tool cannot click inside Google’s closed marker shadow root, so its failed synthetic click is not counted as an app failure.

Screenshots: [public Google tracking](checks/google-map-public-journey.png), [phone public tracking](checks/google-map-phone-journey.png), [phone volunteer map](checks/google-map-volunteer-phone.png), [earlier phone no-key fallback](checks/map-fallback-phone.png).

Live AI checks: **one Jev `jev-latest` classification** returned `{category:"other", urgency:"unclear", sensitivity:"sensitive"}` for a fictional private harassment report; **one OpenRouter `nvidia/nemotron-3-super-120b-a12b:free` ranking** returned the nearby same-zone candidate before the far other-zone candidate. Both used the actual server adapter/strict response validation. No retries, paid routes, purchases or recharge. Jev dollar cost/token usage was not collected. The temporary check used a separately announced, persisted one-call-per-provider limit in ignored `map-ai-check-usage.json`, inherited existing spending-control evidence/expiry and did not change the running app’s store, interactive ledger or proof. Do not rerun/reset the spent check limit. More detail: [live-check record](AI-LIVE-CHECKS.md).

Limitations: physical-phone GPS, multi-device HTTPS access and reliable background updates remain unverified. Native background tracking and publishing are outside this milestone. Wider AI quality remains unverified; these two representative responses do not establish general safety accuracy. The fictional event guide still needs team approval. The existing interactive AI approval expires at `2026-10-07T15:51:28.293Z` (2:51am Melbourne); the 5am continuation must respect expiry and continue simulated checks rather than silently renewing it.

## Handoff and next trial

1. When the other chat is ready, restart the local server with `node --env-file=.env server/index.cjs`; backend changes require a restart and staff must sign in again. Do not restart an active teammate server unexpectedly.
2. Open attendee, Mo and volunteer tabs. Submit an ordinary report without attendance; confirm its receipt says no volunteer was requested. Make a volunteer available, then choose the incident or have Mo send an offer.
3. Submit a private report and confirm only Mo/chosen recipient gets its details. On an accepted assignment, Mo can start the labelled fictional movement demo; check the attendee’s fixed start/progress and the staff moving pin. Mark arrival/resolution explicitly.
4. For a physical-phone trial, use HTTPS and browser GPS permission, then check last-fix age on two devices. This remains unverified and no public deployment was authorised.

The 5am continuation should review new concurrent changes against this evidence and continue meaningful checks where needed. It must preserve expired/spent AI allowances; useful simulated checks and Maps/UI verification remain available if inference is disabled. There are no unresolved product decisions or integration blockers for the completed local browser MVP. Broader model reliability, physical-device access and native background tracking are not claimed.

Final UI follow-up: incoming offers and accepted assignments now disable other claim buttons independently of location-sharing state. The UI asks the volunteer to respond to their offer or finish their assignment, instead of inviting an action that the server would reject. `claims-client.test.cjs` verifies both cases and re-enabling after resolution. The final 143-test run includes this fix.

## 5am continuation — 8 October

The worktree was clean at `c9d4b44`; no concurrent changes needed integration. The previous local server had stopped. Started the saved current version with `.env` at `http://127.0.0.1:8765/`, without interrupting another process, and verified actual Google loading, attribution/zoom and all three fictional station markers in the public browser view. [Current startup screenshot](checks/morning-startup.png). Existing accounts/reports remain stored; staff sign in again after startup. The previous restart instruction is now fulfilled.

Read-only provider status confirmed both AI routes are disabled because the original approval expired. Original interactive remaining-call counts were Jev 11/OpenRouter 12; these are not current dollar balances and include activity outside the separate map check. No live calls, approval renewal, ledger reset, new purchases or recharge were performed. Maps loads independently of inference. No new report/account was created in the user's store for this check.

There was no new source change or regression evidence to justify repeating the full 143-test suite. The last passing evidence remains applicable. Physical-phone GPS/HTTPS and wider model quality remain unverified. The one-time continuation has now run; the local app is left running for the user.
