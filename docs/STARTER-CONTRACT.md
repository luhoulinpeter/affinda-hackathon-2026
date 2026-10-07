# Starter contract

This describes the implemented local service, not a deployed HTTP API. Classic scripts work without installing packages. The interface calls `window.RiversideIncidents`; moving to a server will require making the relevant callers asynchronous together. No browser state or identity is trusted security.

## Files and load order

`data/fixtures.js` → `src/js/services/analysis.js` → `src/js/domain/incidents.js` → `src/js/ui/app.js`.

The store is in memory for one tab. Refresh starts empty. IDs such as `R-1` and `I-1` are local demo identifiers, not globally unique. There is no cross-tab or cross-device sharing.

## Implemented calls

```js
const incident = await RiversideIncidents.submitReport({
  volunteerId: 'vol-priya',
  zone: 'zone-b',
  text: 'A fictional spill beside the water tent.',
  immediateConcern: false
});

RiversideIncidents.getState(); // defensive copy of { reports, incidents }
RiversideIncidents.act(incident.id, 'acknowledge', { id: 'mo', role: 'mo' });
RiversideIncidents.act(incident.id, 'escalate', { id: 'vol-priya', role: 'volunteer' });
RiversideIncidents.act(incident.id, 'resolve', { id: 'mo', role: 'mo' });
const unsubscribe = RiversideIncidents.subscribe(() => { /* render state */ });
```

Invalid input/actions throw an Error with a user-readable message. `submitReport` rejects invalid input. A failed analysis does not reject or discard an already saved report: it returns an incident with `analysis.state === 'failed'` for human review.

## Shapes

```text
Report:
  id, volunteerId, zone, text, immediateConcern (boolean), time (ISO string)

Incident:
  id, reportIds[], zone, category, brief,
  status: open | escalated | resolved,
  attention: review | urgent,
  assignee: null (assignment not implemented),
  acknowledgedBy: null | 'mo',
  resolvedBy: null | { id, role }, resolvedAt: null | ISO string,
  analysis: { state: pending | complete | failed, mode: 'stub', suggestion? },
  history: [{ actorId, actorRole, action, time }]
```

The original report is saved and made visible before analysis runs. Every report creates a separate incident. The stub returns `unclassified`, `unclear`, `linkTo: null` and `mode: 'stub'`; it performs no model call. Suggestions are stored separately and cannot assign, merge, resolve or downgrade urgency.

Only Mo may acknowledge. Mo, the assigned volunteer (future), or an original reporter may escalate or explicitly resolve. Acknowledgement and escalation keep the incident open. Resolution records the actor and time; there is no timer or automatic closure. These are local demo checks, not server authentication.

## Agree before implementing next

- **Person 1 + 2:** action requests and responses for offers, accept/decline, arrival, correction, Split and Merge. Separate assignment progress from incident resolution. Preserve original reports and audit history through grouping changes.
- **Person 2 + 3:** a server-side validator for real model results, valid categories, urgency signals, uncertain/multiple matches, and whether related incidents are separate from duplicate reports. The starter rejects non-stub results until this exists.
- **Person 2:** roster skills, availability, current assignment, coverage minimums and identity enforcement. No policy is implied by the three fictional volunteer examples.
- **Person 1 + 3:** audio upload, transcription request/response, editing and original-audio retrieval. Keep text usable when voice fails.
- **Everyone:** server run instructions, data persistence/reset policy and the shared deployment configuration.

Suggested future HTTP routes from Armaan's plan are `POST /reports`, `GET /incidents`, and `POST /incidents/:id/action`. Add source-report and voice retrieval contracts when implementing those services. Do not let separate interfaces keep independent copies of authoritative incident state.
