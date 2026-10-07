# Server and browser contract

The browser loads fixtures, `src/js/services/api.js`, then `src/js/ui/app.js`. The incident domain and analysis adapter run on the server. The server is the source of truth; `getState()` in the browser is only a defensive copy of the latest permitted response.

## Sessions and entry

`GET /api/session` returns `{ user, guest, csrf, setupRequired, ai, guideApproved }`. `user` is null for event-goers or `{ username, id, role, name }` for signed-in staff. The interface follows this role automatically. Event-goers do not sign in.

Every API request sends a random tab selector in `X-Riverside-Tab`; the live-update stream uses the non-secret `?tab=` selector instead. State-changing requests also send JSON and the `X-CSRF-Token` from the session response. The server selects an HttpOnly `riverside_session_<tab-id>` cookie, verifies its binding to the tab and signed browser guest identity, and derives the role from the server session. Request-body actor IDs/roles are ignored. Sign-in/sign-out affects only the selected tab. See [independent tab sessions](TAB-SESSIONS.md).

| Endpoint | Behaviour |
|---|---|
| `POST /api/setup` | Create the first Mo account once, using `{ username, password }` |
| `POST /api/login` | Verify `{ username, password }`, rotate the staff session |
| `POST /api/logout` | Invalidate the staff session and restore public access |
| `POST /api/accounts` | Mo only: create a volunteer account using `{ username, password, volunteerId }` |
| `GET /api/state` | Return only reports/incidents permitted for the current actor |
| `POST /api/qa` | Accept `{ question, history: [{ question, answer }] }` (at most four prior exchanges); derive identity from the session; return `{ outcome, answer, sources, draft? }` |
| `POST /api/reports` | Accept `{ zone, category, text, immediateConcern }`; derive public/Volunteer/Mo reporter from session; persist and return `{ id }` before background analysis finishes |
| `POST /api/incidents/:id/action` | Apply `{ action }` as the current actor; never accept a client-selected actor |
| `GET /api/events` | Server-Sent Events stream. Sends `event: state` with empty data whenever reports/incidents change; clients then re-fetch `/api/state`, so no data bypasses role scoping. `api.js` subscribes automatically |
| `POST /api/reset` | Demo only, Mo only: clear all reports and incidents and restart IDs at `I-1`. Accounts are kept. From the browser console while signed in as Mo: `RiversideAPI.resetDemo()` |

Errors return a non-success HTTP status and `{ error }`. The browser refreshes session/state after mutations and every six seconds while visible. Forms keep their input during background refresh; identity changes clear unsent report text. A server outage is shown as an error.

## State and actions

```text
Report:
  id, reporter: { id, role: public | volunteer | mo },
  volunteerId: string | null (compatibility field), category,
  zone, text, immediateConcern, time

Incident:
  id, reportIds[], zone, category, brief,
  status: open | escalated | resolved, attention: review | urgent,
  assignee: null (not yet implemented), acknowledgedBy,
  resolvedBy: null | { id, role }, resolvedAt,
  analysis: { jev: { state, suggestion? }, luna: { state, suggestion? } }, history[]
```

Mo receives all records. Volunteers receive their own reports and assigned incidents. Event-goers receive only their own source reports and a reduced incident status record, without internal history or other reporters' sources. Guest history depends on the signed browser cookie, not a guessable report reference.

Only Mo may acknowledge. Mo, the assigned volunteer or the original reporter may explicitly resolve. Public reporters cannot escalate or acknowledge. Volunteers may escalate their own/assigned incidents. Acknowledgement and escalation leave the incident open. There is no automatic closure or timeout.

`analysis.luna` and `session.ai.luna` are retained compatibility fields for the language-model result/status, now backed by OpenRouter. `session.ai.luna.label` is `OpenRouter` and its `model` identifies the pinned free model. Provider status also includes `remainingCalls` (null without a configured allowance); exhausted allowances report disabled and cannot send inference. Jev supports an explicit existing-credit session capped at 20 calls, with checked balance and recharge off, distinct from a verified provider hard stop. The private call ledger uses `openrouter:<proof.id>`; old Luna verification cannot enable it.

The original report and its reporter-selected category are saved before independent Jev/OpenRouter calls. Each result is pending, complete or failed. Valid Jev suggestions update the incident category and can promote attention to urgent; the LLM supplies a labelled summary. Neither can change location, assignment, human history or resolution. Provider failure retains the original report for Mo; each report remains a separate incident. Restart marks interrupted analysis failed without replaying requests. Older stub records remain readable and appear as unavailable analysis.

## Q&A

`outcome` is `answer`, `unknown`, `report_draft` or `unavailable`. Sources contain `{ id, title, text }`, restricted before any provider call. Safety/unclear screening returns a draft `{ text, category, immediateConcern }` made from the original question; submission still uses `/api/reports` with user-selected zone and explicit confirmation. Failed screening also offers a reporting draft, explicitly labelled unavailable and not submitted. Informational answers require valid permitted citation IDs unless unknown. Model responses are plain text, never executable HTML.

Approved public guide entries are shared; staff guidance is withheld from event-goers. Incident details are bounded to the latest 30 permitted incidents and 16,000 source characters, with a count overview and explicit truncation notice. Accounts, credentials, internal history and previous model analysis are not Q&A sources. History is untrusted page-only context, not evidence; logout/identity changes clear it and discard pending answers. Staff sessions are rechecked after provider waits. Failed providers never block reporting. See [AI-SETUP.md](AI-SETUP.md) for credit gates and limitations.

## Remaining contracts from the original plan

- Real Jev/OpenRouter access, verified credit-only controls, team approval of the fictional guide and real-call evaluation. The code and Q&A API exist; live providers have not been verified.
- Offer, accept/decline, arrival and proposed-resolution actions, distinct from final incident resolution.
- Roster skills, availability, current assignments and minimum zone coverage; eligibility checked on the server before an offer.
- Validated volunteer candidate selection once eligibility/coverage and offers exist; no assignment is performed by the current adapters.
- Zone counts, cluster-alert rules and a map based on stored reports; the team defines thresholds and coverage rules.
- Audio upload, transcription, editable transcript and original-audio retrieval; text stays usable if voice fails.
- Hosting, HTTPS, administrator provisioning and persistent deployment storage.

Armaan's duplicate-grouping/Split/Merge revision is set aside. It is not a prerequisite for the original plan.

Reset preserves accounts, the persisted report/incident sequence and provider credit allowances. Old incident IDs are never reused after reset or restart. Pending analysis and Q&A from the previous reset generation are discarded. Workflow persistence includes `sequence`; role-filtered record access is unchanged.

## GPS assistance extension — 7 October 2026

Mo can send `POST /api/incidents/:id/assignment-offer` with `{volunteerId}` to create a manual 60-second offer on any unresolved report, with or without requester GPS. The recipient uses the existing accept/decline route; decline/expiry returns a manual offer to Mo. Presence opt-in accepts `start:true` to explicitly start a ten-minute lease and periodic updates use `start:false` without renewing it. Presence includes `expiresAt`, `eligible`, `fresh`, `hasAccount` and a pause reason. `fresh` means a fix within 60 seconds; eligible matching may use the labelled last-known position within the fixed ten-minute session. Hidden tabs no longer auto-pause. See [current behaviour and limits](GPS-ASSISTANCE.md#latest-update-mo-offers-and-ten-minute-sharing).

The role-filtered state and report submission contracts now include optional GPS assistance and volunteer offers. See [the current API and lifecycle contract](GPS-ASSISTANCE.md#api-additions). Existing reports have no assistance request by default. Station lookup is separate from report creation; model input never includes structured GPS.
