# Server and browser contract

The browser loads fixtures, `src/js/services/api.js`, then `src/js/ui/app.js`. The incident domain and analysis adapter run on the server. The server is the source of truth; `getState()` in the browser is only a defensive copy of the latest permitted response.

## Sessions and entry

`GET /api/session` returns `{ user, guest, csrf, setupRequired, ai, guideApproved }`. `user` is null for event-goers or `{ username, id, role, name }` for signed-in staff. The interface follows this role automatically. Event-goers do not sign in.

State-changing requests send JSON and the `X-CSRF-Token` from the session response. Cookies are HttpOnly. Request-body actor IDs/roles are ignored: the server derives identity from its verified cookie/session.

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
  status: open | escalated | resolved,
  attention: routine | review | urgent   (routine = a volunteer is handling it; review/urgent = Mo should look),
  assignee: null | volunteerId,
  assignment: null | { volunteerId, state: offered | accepted | arrived | proposed,
                       offeredBy, offeredAt, acceptedAt?, arrivedAt?, proposedAt? },
  declinedBy: volunteerId[], acknowledgedBy,
  resolvedBy: null | { id, role }, resolvedAt,
  analysis: { jev: { state, suggestion? }, luna: { state, suggestion? } }, history[]
```

Mo receives all records. Volunteers receive their own reports and assigned incidents. Event-goers receive only their own source reports and a reduced incident status record, without internal history or other reporters' sources. Guest history depends on the signed browser cookie, not a guessable report reference.

### Routing and offers (Person 2, implemented 7 October)

Rules in `data/fixtures.js` (team decisions): any safety volunteer can take any issue type; each zone keeps at least 1 available volunteer; 2 open reports in one zone within 10 minutes is a cluster. The 12-person roster with shift times is a fictional proposal for the team to edit.

- **On every new report**, before any AI call, the server offers the incident to the first eligible volunteer. **Eligible** means on shift, not already on an open incident, not someone who declined this incident, and moving them would not drop their home zone below its minimum. Volunteers already in the incident's zone come first. Nobody eligible means the incident stays open, gets `attention: urgent`, and history records `no_eligible_volunteer`.
- **Starting attention:** `urgent` for an immediate-concern flag or crowd-pressure text; `review` for category `other`; otherwise `routine`. Attention only rises automatically: Jev `urgent` raises it to urgent, and Jev `unclear` or a Jev failure raises it to review. AI never changes the assignee.

`POST /api/incidents/:id/action` body `{ action, volunteerId? }`:

| Action | Who | Effect |
|---|---|---|
| `accept` | offered volunteer | `offered` → `accepted` |
| `decline` | offered volunteer | records `declinedBy`, raises attention to `review`, offers the next eligible volunteer (or urgent if none) |
| `arrived` | assigned volunteer | `accepted` → `arrived` |
| `propose_resolution` | assigned volunteer | → `proposed`; raises attention to `review`; **incident stays open** |
| `offer` | Mo | `{ volunteerId }`; only when nobody is assigned |
| `reassign` | Mo | `{ volunteerId }`; replaces the current volunteer (history keeps `previous`, `override: true`) |
| `acknowledge`, `escalate`, `resolve` | as below | unchanged |

Mo's offer/reassign rejects off-shift, unknown or already-busy volunteers. Mo **may** override coverage: the response is `{ ok: true, warning: "Zone C · Entry drops to 0 available (minimum 1)." }`, and the history entry records `details.coverage` `{ zone, before, after, minimum, belowMinimum }`. An offered volunteer cannot resolve until they accept. Offers never time out. In the browser, `RiversideAPI.act(id, action, { volunteerId })` resolves to that response.

**Mo's `/api/state` also includes** (derived on every request, never stored):
- `zones[]`: `{ id, name, open, unacknowledged, urgent, resolved, coverage: { available, minimum }, cluster: { active, recentReports, threshold, minutes } }`
- `roster[]`: `{ id, name, zone, onShift, assignedTo }`
- `eligible`: `{ [openIncidentId]: volunteerId[] }`, in offer order

Volunteers and event-goers do not receive these fields. Volunteers see incidents offered or assigned to them.

Only Mo may acknowledge. Mo, the assigned volunteer (after accepting) or the original reporter may explicitly resolve. Public reporters cannot escalate or acknowledge. Volunteers may escalate their own/assigned incidents. Acknowledgement and escalation leave the incident open. There is no automatic closure or timeout.

The original report and its reporter-selected category are saved before independent Jev/Luna calls. Each result is pending, complete or failed. Valid Jev suggestions update the incident category and can promote attention to urgent; Luna supplies a labelled summary. Neither can change location, assignment, human history or resolution. Provider failure retains the original report for Mo; each report remains a separate incident. Restart marks interrupted analysis failed without replaying requests. Older stub records remain readable and appear as unavailable analysis.

## Q&A

`outcome` is `answer`, `unknown`, `report_draft` or `unavailable`. Sources contain `{ id, title, text }`, restricted before any provider call. Safety/unclear screening returns a draft `{ text, category, immediateConcern }` made from the original question; submission still uses `/api/reports` with user-selected zone and explicit confirmation. Failed screening also offers a reporting draft, explicitly labelled unavailable and not submitted. Informational answers require valid permitted citation IDs unless unknown. Model responses are plain text, never executable HTML.

Approved public guide entries are shared; staff guidance is withheld from event-goers. Incident details are bounded to the latest 30 permitted incidents and 16,000 source characters, with a count overview and explicit truncation notice. Accounts, credentials, internal history and previous model analysis are not Q&A sources. History is untrusted page-only context, not evidence; logout/identity changes clear it and discard pending answers. Staff sessions are rechecked after provider waits. Failed providers never block reporting. See [AI-SETUP.md](AI-SETUP.md) for credit gates and limitations.

## Remaining contracts from the original plan

- Real Jev/Luna access, verified credit-only controls, team approval of the fictional guide and real-call evaluation. The code and Q&A API exist; live providers have not been verified.
- **Person 1:** buttons for accept/decline/arrived/propose (volunteer), offer/reassign with coverage warning (Mo), and the zone map from `zones[]`. The server side is implemented.
- Optional: Jev choosing among the already-eligible `eligible[id]` list (validated against it). Routing currently takes the first eligible volunteer.
- Audio upload, transcription, editable transcript and original-audio retrieval; text stays usable if voice fails.
- Hosting, HTTPS, administrator provisioning and persistent deployment storage.

Armaan's duplicate-grouping/Split/Merge revision is set aside. It is not a prerequisite for the original plan.

Reset preserves accounts, the persisted report/incident sequence and provider credit allowances. Old incident IDs are never reused after reset or restart. Pending analysis and Q&A from the previous reset generation are discarded. Workflow persistence includes `sequence`; role-filtered record access is unchanged.
