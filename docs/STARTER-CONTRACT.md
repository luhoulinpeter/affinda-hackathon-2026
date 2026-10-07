# Server and browser contract

The browser loads fixtures, `src/js/services/api.js`, then `src/js/ui/app.js`. The incident domain and analysis adapter run on the server. The server is the source of truth; `getState()` in the browser is only a defensive copy of the latest permitted response.

## Sessions and entry

`GET /api/session` returns `{ user, guest, csrf, setupRequired }`. `user` is null for event-goers or `{ username, id, role, name }` for signed-in staff. The interface follows this role automatically. Event-goers do not sign in.

State-changing requests send JSON and the `X-CSRF-Token` from the session response. Cookies are HttpOnly. Request-body actor IDs/roles are ignored: the server derives identity from its verified cookie/session.

| Endpoint | Behaviour |
|---|---|
| `POST /api/setup` | Create the first Mo account once, using `{ username, password }` |
| `POST /api/login` | Verify `{ username, password }`, rotate the staff session |
| `POST /api/logout` | Invalidate the staff session and restore public access |
| `POST /api/accounts` | Mo only: create a volunteer account using `{ username, password, volunteerId }` |
| `GET /api/state` | Return only reports/incidents permitted for the current actor |
| `POST /api/reports` | Accept `{ zone, category, text, immediateConcern }`; derive reporter from session; return `{ id }` |
| `POST /api/incidents/:id/action` | Apply `{ action }` as the current actor; never accept a client-selected actor |

Errors return a non-success HTTP status and `{ error }`. The browser refreshes session/state after mutations and every six seconds while visible. Forms keep their input during background refresh; identity changes clear unsent report text. A server outage is shown as an error.

## State and actions

```text
Report:
  id, reporter: { id, role: public | volunteer },
  volunteerId: string | null (compatibility field), category,
  zone, text, immediateConcern, time

Incident:
  id, reportIds[], zone, category, brief,
  status: open | escalated | resolved, attention: review | urgent,
  assignee: null (not yet implemented), acknowledgedBy,
  resolvedBy: null | { id, role }, resolvedAt, analysis, history[]
```

Mo receives all records. Volunteers receive their own reports and assigned incidents. Event-goers receive only their own source reports and a reduced incident status record, without internal history or other reporters' sources. Guest history depends on the signed browser cookie, not a guessable report reference.

Only Mo may acknowledge. Mo, the assigned volunteer or the original reporter may explicitly resolve. Public reporters cannot escalate or acknowledge. Volunteers may escalate their own/assigned incidents. Acknowledgement and escalation leave the incident open. There is no automatic closure or timeout.

The original report is saved before analysis. The current adapter is explicitly a stub, performs no model call and cannot resolve or assign. Each report currently creates a separate incident. Analysis failure retains it for Mo. Real model outputs still need server-side validation before integration.

## Remaining contracts from the original plan

- Offer, accept/decline, arrival and proposed-resolution actions, distinct from final incident resolution.
- Roster skills, availability, current assignments and minimum zone coverage; eligibility checked on the server before an offer.
- Validated model category and candidate selection, urgent/unclear signals and fallback when a provider fails.
- Zone counts, cluster-alert rules and a map based on stored reports; the team defines thresholds and coverage rules.
- Audio upload, transcription, editable transcript and original-audio retrieval; text stays usable if voice fails.
- Hosting, HTTPS, administrator provisioning and persistent deployment storage.

Armaan's duplicate-grouping/Split/Merge revision is set aside. It is not a prerequisite for the original plan.
