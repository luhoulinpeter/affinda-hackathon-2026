# Roles and timeline

Work split for four people, based on [REVISED-MVP-PROPOSAL.md](REVISED-MVP-PROPOSAL.md). Replace A–D with names.

## Start together (first hour, all four)

- Agree the shared data shapes below so everyone can build at the same time against made-up data.
- Write the fixtures: 3 zones, a roster of about 12 people, and the 20 test messages with their correct grouping.
- Someone submits the **registration and track forms before 5pm Wednesday 7 October**.

```
Report:   { id, volunteerId, zone, text, audioUrl?, time }
Incident: { id, reportIds[], zone, category, urgency, brief,
            status: open|assigned|escalated|resolved,
            assignee?, resolvedBy?, history[] }
AI:       analyse(report, openIncidents) →
            { zone, category, urgency, linkTo: incidentId|null, brief }
API:      POST /reports · GET /incidents · POST /incidents/:id/action
```

## Roles

| Person | Owns | Done when |
|---|---|---|
| **A: Mo's view** <TODO: name> | One-incident card, big action buttons, Split/Merge, the "zone drops below minimum" warning, spoken brief through the earpiece (browser text-to-speech), and the full list one tap away | Mo can handle the 2pm scenario using only the card and their ears |
| **B: Volunteer view, voice and submission** <TODO: name> | Report screen, voice recording → transcript → edit → send, incoming offers (accept/decline/arrived/resolve/escalate), testing on real phones. Also leads the Devpost write-up and the record of which AI tools were used | A voice note sent from a teammate's phone appears in Mo's view |
| **C: Server and rules** <TODO: name> | Small server that holds API keys, incident store, routing (urgent → Mo, routine → eligible volunteer, unclear → Mo), roster eligibility and coverage checks, resolution rules (no auto-close), deployment to a public link | The whole flow works with a fake AI function; prototype link is live |
| **D: AI and evidence** <TODO: name> | Jev setup (check access first) or a fallback model, the extract, link and brief prompts, plugging into `analyse()`, the 20-message accuracy script, and the demo video script | Real calls group new messages, and there is an accuracy number for the pitch |

## Timeline

| When | Milestone |
|---|---|
| Wed 5pm | Forms submitted, team name chosen, data shapes agreed |
| Wed night | **Checkpoint 1:** end-to-end with typed text and the fake AI. Everyone merges to `main` |
| Thu 10am | **Checkpoint 2:** real AI and voice plugged in, deployed link works |
| Thu 12pm | **Feature freeze.** Only fixes from here |
| Thu 12–2pm | Everyone tests edge cases: duplicate reports, wrong zone, nobody eligible, decline, AI failure. D runs the accuracy test |
| Thu 2–3:30pm | Record the demo video (A drives Mo's view, B the volunteer view). B finalises the Devpost text |
| Thu 4pm | **Submit** (one hour of buffer before the 5pm close) |

## Tips

- C builds with a fake `analyse()` that returns made-up output, so A and B aren't blocked waiting on D.
- Each person works on their own branch and merges at each checkpoint.
- Everyone needs to be able to explain the whole product, because judges ask anyone.
