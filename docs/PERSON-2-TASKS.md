# Person 2 task list: application and server

Owner: Armaan (Person 2 in [roles.md](../roles.md)). Written 7 October 2026 from the current repo state, as context for an AI coding agent or teammate picking up this work.

## Read first

| File | Why |
|---|---|
| [PROJECT.md](../PROJECT.md) | Decisions, status, traps, deadlines |
| [docs/STARTER-CONTRACT.md](STARTER-CONTRACT.md) | The implemented service API, data shapes, and what Person 1/2/3 must agree next |
| [roles.md](../roles.md) | Three-person split and file ownership |
| [docs/INCIDENT-MVP-DRAFT.md](INCIDENT-MVP-DRAFT.md) | Team's MVP draft: offers, accept/decline, arrival, coverage, Mo override |
| [REVISED-MVP-PROPOSAL.md](../REVISED-MVP-PROPOSAL.md) | Armaan's revision: AI grouping of reports, Split/Merge, one-card Mo view, coverage warning. **Not yet reconciled with the team draft** |
| [AGENTS.md](../AGENTS.md) | Working rules for AI agents in this repo |

## Context in brief

- **Event:** Affinda AI Innovation Challenge, Track 3 Ground Control. Fictional festival "Riverside" (Fieldday Events). Users: Mo (safety lead, on foot, earpiece, phone in pocket) and safety volunteers.
- **Deadline:** Devpost submission **Thursday 8 October 2026, 5:00pm AEDT**. Needs a working prototype link or clear run steps, plus a demo video. Aim to be feature-frozen by Thursday ~12pm.
- **Product:** volunteers report incidents (text now, voice later); AI suggests category/urgency and groups duplicate reports; reports reach a person (volunteer offer or Mo); Mo oversees urgent, unclear, escalated and clustered incidents.
- **Hard rules (from the brief and team decisions, never break these):**
  - "Every decision about people's safety stays with a person."
  - Every report reaches a person. Nothing is dropped or hidden, including when AI fails.
  - An incident closes **only** when Mo, the assigned volunteer or the original reporter explicitly confirms it. No timeouts, no auto-close, no AI-driven close.
  - AI suggestions can never resolve, assign without validation, downgrade urgency, or delete a source report.
  - Acknowledgement, escalation, acceptance, arrival and proposed resolution are all still **open** states.
  - Fictional data only. API keys only on the server, never in `src/`, `data/` or any browser file.

## Current code (what exists)

- Plain HTML/CSS/JS, **no packages, no build step**. `index.html` loads classic scripts in order: `data/fixtures.js` → `src/js/services/analysis.js` → `src/js/domain/incidents.js` → `src/js/ui/app.js`. Opens by double-click.
- `src/js/domain/incidents.js` (**yours**): in-memory store on `window.RiversideIncidents` with `submitReport` (async), `getState` (sync, defensive copy), `act(incidentId, action, actor)` (sync; actions `acknowledge` | `escalate` | `resolve`), `subscribe`. Reads `window.RiversideData` and `window.RiversideAI`. Saves the report before calling analysis; rejects any non-`stub` AI result.
- `data/fixtures.js` (**yours**): 3 zones (`zone-a` Main stage, `zone-b` Water tent, `zone-c` Entry), 3 volunteers (`vol-priya`, `vol-alex`, `vol-sam`) with only `id`, `name`, `zone`. Mo is the hard-coded actor `{ id: 'mo', role: 'mo' }`.
- `src/js/services/analysis.js` (Person 3): stub `RiversideAI.analyse(report, openIncidents)` returning `{ zone, category: 'unclassified', urgency: 'unclear', linkTo: null, brief, mode: 'stub' }`.
- `src/js/ui/app.js` (Person 1): calls `service.getState()` synchronously (line ~39) and `service.act(...)` synchronously (line ~90). Moving to a server makes these async; **coordinate with Person 1**.
- `tests/incidents.test.cjs` (**yours**): 7 `node:test` tests that load the browser scripts into a `vm` context. All 7 pass (`node --test tests/incidents.test.cjs`, Node v26 on Armaan's Mac).
- `server/`: only a README. No server exists yet.
- `.gitignore` already ignores `.env` and `.env.*` (except `.env.example`).

## Tasks

Priorities: **P0** is needed for a working shared demo; **P1** is needed for the proposed product; **P2** only if time allows. "Agree with" means settle the contract with that person before building.

### P0: shared server behind the existing flow (target: Wednesday night)

1. **Make the domain logic runnable on the server.** Refactor `incidents.js` into a factory, e.g. `createIncidentService({ data, analyse, now })`, usable from Node (`require`) and, if the team wants to keep the double-click mode, still from the browser. Remove the hard dependency on `window`. Keep all 7 existing tests passing; update `setup()` in the test file if the loading changes.
   - Done when: tests pass, and the same rules run in Node.

2. **Create the server** in `server/`. Recommend Node's built-in `node:http` with **no dependencies**, to match the no-install starter (Express is fine if the team prefers it, but add a `package.json`). It should:
   - serve `index.html`, `src/`, `data/` and `assets/` as static files;
   - expose a JSON API (below);
   - read `PORT` from the environment;
   - return `{ error: "user-readable message" }` with a 4xx status for invalid input or actions (the domain already throws readable messages).
   - Done when: `node server/index.js` serves the app at `http://localhost:PORT`.

3. **API routes.** Proposed; confirm with Person 1 and record in `STARTER-CONTRACT.md`:
   ```
   GET  /api/state                    → { reports, incidents }
   POST /api/reports                  body: { volunteerId, zone, text, immediateConcern } → incident
   POST /api/incidents/:id/actions    body: { action, actor: { id, role }, ...params } → incident
   GET  /api/events                   Server-Sent Events: emits "state" when anything changes
   POST /api/reset                    restore demo seed (demo only; label it)
   ```
   - Save the report and send the update **before** awaiting analysis, as the current code does.
   - Done when: two browser tabs, or a laptop and a phone, see each other's changes live.

4. **Browser client adapter.** Add e.g. `src/js/services/api-client.js` that exposes the same `window.RiversideIncidents` interface but calls the API: it keeps a cached state from `/api/state` plus SSE, makes `getState()` return the cache, makes `act()` return a Promise, and calls `subscribe` on each SSE update. **Agree with Person 1** on `act` becoming async (one line in `app.js`, ~line 90, must `await` it and show errors). Decide with the team whether double-click/local mode survives; if it does, pick the adapter by `location.protocol === 'file:'`.
   - Done when: the README "Try the starter" steps work through the server.

5. **Persistence and reset policy.** In-memory state is fine for the demo. Optionally write a JSON snapshot to a git-ignored file so a restart doesn't wipe a demo. Add a reset that loads a seeded scenario, so the demo video can be re-recorded cleanly.

6. **Run docs.** Fill in `server/README.md` (how to run, port, reset, env vars) and add `.env.example` with variable **names only** (e.g. `PORT`, and Person 3's provider key names). Add a "Run with server" section to the root `README.md`.

7. **Server API tests.** Add `tests/server.test.cjs`: start the server on a random port and use `fetch` to cover submit, invalid input → 400, action permissions, resolve-only-by-allowed-actors, and the SSE update.

### P1: the workflow rules behind the product

8. **Roster model** (`data/fixtures.js`). Expand to about 12 fictional volunteers with `skills` (e.g. `first-aid`, `crowd`, `general`), `availability` (shift windows), `zone`, and current assignment. Add per-zone `minimumCoverage`. **The team owns the actual rules**: propose defaults, mark them as proposals and get agreement (STARTER-CONTRACT: "No policy is implied by the three fictional volunteer examples").

9. **Eligibility and coverage (deterministic code, not AI).** `eligibleVolunteers(incident, state)` filters by required skill, availability now, not already assigned, and moving them won't drop their zone below its minimum. Also `coverageImpact(volunteerId, targetZone)` → before/after counts, for Mo's "zone drops below minimum" warning.
   - Done when: unit tests show a wrong-skill, busy, unavailable or coverage-breaking volunteer is never eligible.

10. **Assignment and offer state machine.** Keep assignment progress **separate** from incident status. Add the actions `offer` (system or Mo), `accept`, `decline`, `arrived`, `propose_resolution` (volunteer) and `reassign` (Mo override). Rules:
    - decline → clear the assignee and set attention back to Mo (or offer to the next eligible volunteer);
    - an unacknowledged offer stays visible, with no timer;
    - `propose_resolution` keeps the incident open;
    - the assigned volunteer may `resolve` (`isAssignee` already exists in `act`);
    - no eligible volunteer → incident stays open, attention `urgent` for Mo.
    - Every action goes to `history` with actor and time.
    - **Agree with Person 1** on the exact action names and params.

11. **Routing on new reports.** After analysis (or on failure):
    - urgent, which means `immediateConcern`, or a validated AI urgency of urgent, or crowd pressure → attention `urgent` for Mo immediately, plus an offer if appropriate;
    - routine with an eligible volunteer → automatic offer;
    - unclear or analysis failed → Mo.
    - Routing must never delay or hide Mo's alert.
    - **Team decision pending:** auto-offer without Mo approval (team draft says yes; revision keeps it for routine checks only).

12. **AI result validator.** **Agree with Person 3.** Before any real (non-`stub`) result is used, validate it on the server:
    - `category` must be in the agreed enum (proposal: `medical`, `crowding`, `lost-person`, `staffing`, `hazard`, `other`);
    - `urgency` must be in its enum, and may only **raise** attention, never lower it;
    - `zone` must be a known zone (show it as a suggestion; don't silently move the incident);
    - `linkTo` must be null or an existing **open** incident;
    - `brief` must be a string of at most ~80 characters;
    - unknown fields are ignored;
    - anything invalid → `analysis.state = 'failed'`, report kept, Mo sees it.
    - Replace the current "reject any non-stub result" check with this validator.
    - Keep the existing test "unvalidated real AI output cannot silently resolve or re-route a report" passing in spirit.

13. **Grouping, Split and Merge** (only if the team accepts the revision's grouping). When a validated `linkTo` points to an open incident, attach the report (`reportIds.push`) instead of creating a new incident, and record it in history as an AI suggestion. Add Mo actions:
    - `split(reportId)`: move a report out to a new incident;
    - `merge(otherIncidentId)`: combine two incidents.
    - Never lose an original report or history entry.
    - Decide with the team: are "related" incidents (e.g. crowding at the water station vs. the collapse nearby) linked but kept separate?

14. **Cluster alert.** Rule-based: e.g. at least N open reports in one zone within M minutes → a zone-level alert for Mo. **The team decides N and M** (proposal: 3 in 15 minutes). An isolated routine report must not interrupt Mo.

15. **Zone summary for the UI.** A derived value (in `GET /api/state` or a helper) for each zone: open, unacknowledged, urgent and resolved counts, plus the current coverage vs. minimum. Counts are always derived from stored state, never stored separately.

16. **Server-side AI call wiring.** **Agree with Person 3.** The server, not the browser, calls Person 3's adapter (e.g. `server/services/analysis.js` exporting `analyse(report, openIncidents) → Promise<result>`). Keep the browser stub only for local mode. Add a timeout so a hung provider marks the analysis `failed` instead of hanging; the report stays visible throughout.

### P2: if time allows

17. **Voice endpoints.** **Agree with Persons 1 and 3.** `POST /api/audio` (upload a recording, returns `audioId`), `GET /api/audio/:id`, and an optional `audioId` on the report. Text submission must keep working if voice fails.
18. **Demo identity hardening.** The role selector is demo-only. At minimum, the server validates that the `actor` exists in the roster. Don't describe this as authentication.
19. **Deployment support.** Person 3 owns deployment setup; you supply run and reset instructions. Note: in-memory state needs a **single long-running Node process** (Render, Railway or Fly work; serverless functions like Vercel/Netlify lose state between requests).
20. **Accuracy test support.** Help Person 3 run the ~20 fictional messages through the real pipeline and report the grouping accuracy.

## Edge cases to test (from both drafts)

Duplicate reports, wrong zone, ambiguous text, nobody eligible, decline, offer never acknowledged, resolved after escalation, AI failure or timeout, AI returns invalid or malicious JSON, late AI result after the incident is resolved (an existing test covers this; keep it), two people acting on the same incident at once, invalid input never creating an incident.

## Decisions the team still owns (don't decide silently)

1. Reconcile the team draft with Armaan's revision: grouping and Split/Merge vs. heatmap and public report form.
2. Auto-offer to volunteers without Mo's approval, and for which categories.
3. Skills, availability and per-zone minimums; the cluster threshold.
4. Whether double-click local mode is kept once the server exists.
5. Model choice (Jev vs. another) and validated output fields, with Person 3.

When a decision is made, record it in `PROJECT.md` → Decisions, with the date and reason.

## Working rules

- Branch from the latest `main` (e.g. `armaan/server`). Commit small working steps and open a PR for a teammate to review. Run `node --test tests/` before each push.
- Don't edit Person 1's `src/js/ui/` or `index.html`/CSS beyond agreed contract changes, or Person 3's provider adapters; coordinate instead.
- Update `docs/STARTER-CONTRACT.md` whenever the API or shapes change, and `PROJECT.md` → Status with only things actually tested.
- Keep the "never claim it works without showing it" rule from `AGENTS.md`: report test output and manual check results honestly.
