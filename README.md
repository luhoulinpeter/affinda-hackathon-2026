# Riverside incident-response starter

The team is following [the original incident-response plan](docs/INCIDENT-MVP-DRAFT.md). Event-goers get the public reporting page by default. Staff sign in to the Volunteer or Mo workspace assigned to their account. Armaan's revision is set aside.

## Start the app

Node.js is required; no package installation is needed.

1. In a terminal in this folder, run `node server/index.cjs`.
2. Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/).
3. The event-goer reporting page opens without sign-in. Use fictional reports only.
4. Click **Staff sign in**. On the first run, create the first Mo account with your own username and a password (both username and password may be any non-empty length). Enter passwords in the browser, never in chat.
5. In Mo's workspace, expand **Volunteer accounts** to create a username/password for someone on the fictional volunteer roster.
6. Sign out, then sign in with that volunteer account. The Volunteer workspace opens automatically; there is no role chooser.

Opening `index.html` directly is no longer supported: real accounts and permissions require the running server. This replaces the earlier static Python preview. By default the server listens only on this computer. HTTPS deployment configuration is available in [server instructions](server/README.md); actual hosting and physical-phone access remain unverified.

## Try the workflow

- As an event-goer, use **Use example text**, then **Send report**. Its reference and status appear under **Your reports**.
- Sign in as Mo to review it. Acknowledging or escalating keeps it open. Only explicit resolution closes it and records who confirmed and when.
- Sign out to return to the same browser's event-goer history. Its original reporter can also confirm resolution.
- In a private browser window, unrelated event-goer reports should not appear.
- Volunteer accounts see their own reports and, when assignment is implemented, assigned incidents. They cannot read Mo's full queue or create accounts.

The server stores reports and password hashes in `.riverside/store.json`, excluded from Git and unavailable through the web server. Reports/accounts survive restarts. Staff sessions last up to eight hours and require sign-in again after a restart. Public report ownership uses a signed cookie lasting up to seven days; clearing that cookie loses access to the original reporter's history.

Browsers receive live change signals and reload their own permitted records; six-second polling remains as a fallback. Mo can clear fictional reports with `RiversideAPI.resetDemo()` in the browser console. Accounts, unique ID allocation and provider credit allowances survive reset.

## Three-person file ownership

See [roles.md](roles.md) and [the API contract](docs/STARTER-CONTRACT.md).

| Area | Files |
|---|---|
| Person 1: public and staff interface | `index.html`, `src/css/app.css`, `src/js/ui/app.js`, `src/js/ui/qa.js` |
| Person 2: server, permissions and workflow | `server/index.cjs`, `server/auth.cjs`, `src/js/services/api.js`, `src/js/domain/incidents.js`, `data/fixtures.js` |
| Person 3: Jev, LLM and voice integration | `src/js/services/analysis.js`, `server/ai/`, `data/event-guide.json` |

Report analysis and Q&A are implemented with separate server-side Jev and OpenRouter adapters. All three views have a question panel, permission-filtered sources and confirmed report drafts; Mo can submit a draft too. Live calls are disabled by default. Basic real responses are verified; wider model quality and Jev provider billing hard stops remain unverified and the fictional event guide awaits team approval. Follow [AI setup](docs/AI-SETUP.md) before enabling either provider. OpenRouter defaults to Nemotron 3 Super (free) with paid routes blocked. Small live checks and bounded interactive use are now authorised; notify before larger runs and do not silently expand allowances. No credit purchases, recharge or paid OpenRouter routes are authorised. See [model research](docs/OPENROUTER-MODELS.md).

The team chose to keep the current stack. Voice, automatic assignment, coverage checks, maps and public deployment remain later tasks. The layout adapts below 720px, with large action buttons and a collapsible incident queue. See [the settled AI plan](docs/AI-PLAN.md).

## Verification

Run `npm test` (equivalent to `node --test tests/*.test.cjs`). AI tests use simulated responses, never real API calls. The server test creates isolated temporary accounts and data, checks role restrictions and server restart, and removes its own test directory. No test account is created in your app database.

## Team workflow

Start each task branch from the latest `main`, commit small working steps, and have a teammate review each pull request. Keep [PROJECT.md](PROJECT.md) updated with decisions, checked behaviour and the main AI tools used. Never commit credentials or real personal data. Provider keys belong in server environment variables.
