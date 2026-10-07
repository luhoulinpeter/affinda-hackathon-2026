# Riverside incident-response starter

The team is following [the original incident-response plan](docs/INCIDENT-MVP-DRAFT.md). Event-goers get the public reporting page by default. Staff sign in to the Volunteer or Mo workspace assigned to their account. Armaan's revision is set aside.

## Start the app

Node.js is required; no package installation is needed.

1. In a terminal in this folder, run `node server/index.cjs`. If your keys are saved in `.env`, use `node --env-file=.env server/index.cjs` instead so Maps and authorised AI settings load.
2. Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/).
3. The event-goer reporting page opens without sign-in. Use fictional reports only.
4. Click **Staff sign in**. On the first run, create the first Mo account with your own username and a password (both username and password may be any non-empty length). Enter passwords in the browser, never in chat.
5. In Mo's workspace, expand **Volunteer accounts** to create a username/password for someone on the fictional volunteer roster.
6. Sign out, then sign in with that volunteer account. The Volunteer workspace opens automatically; there is no role chooser.

Opening `index.html` directly is no longer supported: real accounts and permissions require the running server. This replaces the earlier static Python preview. By default the server listens only on this computer. HTTPS deployment configuration is available in [server instructions](server/README.md); actual hosting and physical-phone access remain unverified.

## Try the workflow

- As an event-goer, use **Use example text**, then **Send report only**. Its reference and status appear under **Your reports**. Use **Send & request volunteer** to request attendance and share your current GPS; reporting alone does not request attendance.
- Sign in as Mo to review it. Acknowledging or escalating keeps it open. Only explicit resolution closes it and records who confirmed and when.
- Sign out to return to the same browser's event-goer history. Its original reporter can also confirm resolution.
- In a private browser window, unrelated event-goer reports should not appear.
- Volunteer accounts see their own reports and offered/assigned incident details. Available volunteers can choose ordinary waiting incidents or wait for Mo's offer. Other ordinary incidents appear as minimal pins/cards; private or unchecked reports wait for Mo's personal assignment. Volunteers cannot read Mo's full queue or create accounts.

The server stores reports and password hashes in `.riverside/store.json`, excluded from Git and unavailable through the web server. Reports/accounts survive restarts. Staff sessions last up to eight hours and require sign-in again after a restart. Public report ownership uses a signed cookie lasting up to seven days; clearing that cookie loses access to the original reporter's history.

Staff sign-in is independent per tab: open Mo, a volunteer and an event-goer in three tabs of the same browser. Refresh keeps that tab's sign-in; signing out does not change the others. Guest report history remains shared within the browser profile. Only one tab/device may actively share location for the same volunteer account. See [tab-session behaviour and verification](docs/TAB-SESSIONS.md).

Browsers receive live change signals and reload their own permitted records; six-second polling remains as a fallback. Mo can clear fictional reports with `RiversideAPI.resetDemo()` in the browser console. Accounts, unique ID allocation and provider credit allowances survive reset.

## Three-person file ownership

See [roles.md](roles.md) and [the API contract](docs/STARTER-CONTRACT.md).

| Area | Files |
|---|---|
| Person 1: public and staff interface | `index.html`, `src/css/app.css`, `src/js/ui/app.js`, `src/js/ui/qa.js` |
| Person 2: server, permissions and workflow | `server/index.cjs`, `server/auth.cjs`, `src/js/services/api.js`, `src/js/domain/incidents.js`, `data/fixtures.js` |
| Person 3: Jev, LLM and voice integration | `src/js/services/analysis.js`, `server/ai/`, `data/event-guide.json` |

Report analysis and Q&A are implemented with separate server-side Jev and OpenRouter adapters. All three views have a question panel, permission-filtered sources and confirmed report drafts; Mo can submit a draft too. Live calls are disabled by default. Basic real responses are verified; wider model quality and Jev provider billing hard stops remain unverified and the fictional event guide awaits team approval. Follow [AI setup](docs/AI-SETUP.md) before enabling either provider. OpenRouter defaults to Nemotron 3 Super (free) with paid routes blocked. Small live checks and bounded interactive use are now authorised; notify before larger runs and do not silently expand allowances. No credit purchases, recharge or paid OpenRouter routes are authorised. See [model research](docs/OPENROUTER-MODELS.md).

The team chose to keep the current stack. Voice, coverage checks and public deployment remain later tasks. Google Maps, GPS assistance, volunteer self-selection, private-report review and advisory volunteer ranking are implemented. Actual Google loading and three-role browser scenarios have been checked; physical-device GPS remains unverified. The layout adapts below 720px, with large action buttons and a collapsible incident queue. See [the settled AI plan](docs/AI-PLAN.md) and [map evidence/checklist](docs/OVERNIGHT-MVP-PLAN.md).

## Verification

Run `npm test` (equivalent to `node --test tests/*.test.cjs`). AI tests use simulated responses, never real API calls. The server test creates isolated temporary accounts and data, checks role restrictions and server restart, and removes its own test directory. No test account is created in your app database.

## Team workflow

Start each task branch from the latest `main`, commit small working steps, and have a teammate review each pull request. Keep [PROJECT.md](PROJECT.md) updated with decisions, checked behaviour and the main AI tools used. Never commit credentials or real personal data. Provider keys belong in server environment variables.

### GPS assistance

Use **Send & request volunteer** in the main report form to request attendance and share GPS. **Send report only** can optionally attach GPS without requesting attendance. Signed-in volunteers opt in with **Go available**. Mo sees offered/accepted responders, reviews private/unchecked reports and configures fictional first-aid stations. Three fictional University-area stations seed only when no saved settings exist; no volunteer passwords are seeded. See [the setup and behaviour guide](docs/GPS-ASSISTANCE.md). Real phone GPS needs HTTPS and permission.

Attendees see their assigned volunteer's frozen starting ping, their own destination and a dotted grey-to-white progress curve. Moving volunteer positions stay on the staff maps. Mo can start/stop a clearly labelled fictional 90-second journey on an accepted assignment; it never marks arrival or resolves the incident. Mo's **Suggest with AI** button ranks eligible volunteers using free OpenRouter; Mo still chooses and sends the offer.

For Google Maps, place a no-billing Maps Demo Key after `GOOGLE_MAPS_API_KEY=` in the ignored local `.env`, then start with `node --env-file=.env server/index.cjs`. The browser Maps key is served deliberately to Google Maps; AI provider keys remain server-only. Without a Maps key, the app lists fictional help stations and retains reporting/assignment controls. See [key setup and verification limits](docs/OVERNIGHT-MVP-PLAN.md#maps-credential-preparation).
