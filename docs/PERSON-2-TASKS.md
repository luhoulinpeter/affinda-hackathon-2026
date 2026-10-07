# Person 2 task list: application and server

Owner: Armaan (Person 2 in [roles.md](../roles.md)). Written 7 October 2026 from the current repo state, as context for an AI coding agent or teammate picking up this work.

## Read first

| File | Why |
|---|---|
| [PROJECT.md](../PROJECT.md) | Decisions, status, traps, deadlines |
| [docs/STARTER-CONTRACT.md](STARTER-CONTRACT.md) | The implemented service API, data shapes, and what Person 1/2/3 must agree next |
| [roles.md](../roles.md) | Three-person split and file ownership |
| [docs/INCIDENT-MVP-DRAFT.md](INCIDENT-MVP-DRAFT.md) | Team's MVP draft: offers, accept/decline, arrival, coverage, Mo override |
| [docs/AI-PLAN.md](AI-PLAN.md) | Settled Jev/OpenRouter boundaries and Q&A contract |
| [AGENTS.md](../AGENTS.md) | Working rules for AI agents in this repo |

## Context in brief

- **Event:** Affinda AI Innovation Challenge, Track 3 Ground Control. Fictional festival "Riverside" (Fieldday Events). Users: Mo (safety lead, on foot, earpiece, phone in pocket) and safety volunteers.
- **Deadline:** Devpost submission **Thursday 8 October 2026, 5:00pm AEDT**. Needs a working prototype link or clear run steps, plus a demo video. Aim to be feature-frozen by Thursday ~12pm.
- **Product:** volunteers report incidents (text now, voice later); AI suggests category/urgency and summarises original reports; grouping remains set aside; reports reach a person (volunteer offer or Mo); Mo oversees urgent, unclear, escalated and clustered incidents.
- **Hard rules (from the brief and team decisions, never break these):**
  - "Every decision about people's safety stays with a person."
  - Every report reaches a person. Nothing is dropped or hidden, including when AI fails.
  - An incident closes **only** when Mo, the assigned volunteer or the original reporter explicitly confirms it. No timeouts, no auto-close, no AI-driven close.
  - AI suggestions can never resolve, assign without validation, downgrade urgency, or delete a source report.
  - Acknowledgement, escalation, acceptance, arrival and proposed resolution are all still **open** states.
  - Fictional data only. API keys only on the server, never in `src/`, `data/` or any browser file.

## Current code (what exists)

Updated 7 October 2026 with main's Jev/OpenRouter integration and Armaan's server changes. Run `npm test` and `node server/index.cjs` → `http://127.0.0.1:8765/`.

- `server/index.cjs`: Node `node:http` server, no dependencies, local mode binds to `127.0.0.1`; HTTPS deployed mode is configurable. Serves an allowlist of browser files. Routes: `/api/session`, `/api/setup`, `/api/login`, `/api/logout`, `/api/accounts`, `/api/state`, `/api/qa`, `/api/reports`, `/api/incidents/:id/action`, `/api/events` (live-update stream), `/api/reset` (Mo-only demo reset). See `docs/STARTER-CONTRACT.md`.
- `server/auth.cjs`: scrypt password hashing, signed cookies. Staff accounts are real (Mo created at first run; Mo creates volunteer accounts). Guests (event-goers) report anonymously via a signed cookie.
- `src/js/domain/incidents.js`: factory `(data, getAI, initial, persist)` used by the server. Actions `acknowledge` | `escalate` | `resolve`, plus `reset()`. Validates independent Jev/OpenRouter results; preserves urgent flags and human resolution. Reset retains a durable ID counter and discards old pending results.
- `src/js/services/api.js`: browser client on `window.RiversideAPI`. Async `act`/`submitReport`, subscribes to `/api/events`; the UI also polls every 6s.
- State persists to `.riverside/store.json` (git-ignored). Double-click mode is gone; the server is required.
- Team decisions since this list was first written: original plan chosen, **grouping/Split/Merge set aside**; public/Volunteer/Mo views with real sign-in; a separate LLM alongside Jev (`docs/AI-PLAN.md`); **stack kept: Node server + JSON file, no database** (decided 7 Oct).

## Tasks

**P0** = working shared demo; **P1** = the proposed product; **P2** = if time allows. "Agree with" means settle the contract first.

### P0: done

1. ~~Domain logic runnable on the server~~ (done on `main`).
2. ~~Create the server~~ (done on `main`).
3. ~~API routes~~ (done on `main`), plus live updates `GET /api/events` and Mo-only `POST /api/reset` (done, Armaan branch, tested).
4. ~~Browser client adapter~~ `api.js` (done on `main`; subscribes to live updates).
5. ~~Persistence and reset~~ (JSON store on `main`; reset added). A **seeded demo scenario** is not built: the team should write the fictional reports it wants in the demo video.
6. ~~Run docs~~ (`server/README.md`). `.env.example` includes deployment/provider variable names; live providers default to disabled.
7. ~~Server API tests~~ (`tests/server.test.cjs`, now including events and reset).

### P0: still open

- **Phone access / deployment.** Local mode accepts localhost; deployed mode requires a valid HTTPS public origin. Hosting and physical-phone access remain unverified. Needed for phone testing and a public prototype link. Agree with the team: deploy (Render, Railway or Fly: one long-running process with a persistent disk; serverless platforms lose state), or allow LAN hosts. Either requires HTTPS/`secureCookies` and a host allowlist, not just removing the check.

### P1: the workflow rules behind the product

8. **Roster model** (`data/fixtures.js`). About 12 fictional volunteers with `skills`, `availability`, `zone` and current assignment; per-zone `minimumCoverage`. **The team owns the rules**: propose defaults, mark them as proposals, get agreement.
9. **Eligibility and coverage (deterministic code, not AI).** `eligibleVolunteers(incident, state)` filters by skill, availability, not already assigned, and not dropping a zone below its minimum. `coverageImpact(volunteerId, targetZone)` → before/after counts for Mo's warning. Unit tests: wrong-skill, busy, unavailable or coverage-breaking volunteers are never eligible.
10. **Assignment and offer state machine**, separate from incident status. Actions `offer`, `accept`, `decline`, `arrived`, `propose_resolution`, `reassign` (Mo). Decline → back to Mo or next eligible; unacknowledged offers stay visible with no timer; `propose_resolution` keeps it open; no eligible volunteer → open, `urgent` for Mo; every action in `history`. **Agree with Person 1** on names/params.
11. **Routing on new reports.** Urgent → Mo immediately (plus offer if appropriate); routine with an eligible volunteer → automatic offer (team draft: no Mo approval needed); unclear or analysis failed → Mo. Routing never delays Mo's alert.
12. **AI result validator: implemented.** Jev categories/urgency and LLM summaries use strict schemas; malformed output fails without hiding the source report or changing human actions.
13. ~~Grouping, Split and Merge~~: set aside by the team.
14. **Cluster alert.** Rule-based, e.g. N open reports in one zone within M minutes → a zone alert for Mo. **The team decides N and M.**
15. **Zone summary.** Per-zone open, unacknowledged, urgent, resolved counts and coverage vs minimum, always derived from stored state (supports the team's zone map).
16. **Server-side AI calls: implemented, live access unverified.** Independent Jev/OpenRouter jobs use timeouts and persisted credit allowances. See `docs/AI-SETUP.md`; do not enable calls without setup checks and the latest bounded live-use authorisation; free OpenRouter inference uses quota too.
16b. **Role-scoped Q&A: implemented.** Public users see their own records and approved public guide entries; staff receive permitted records and staff guidance. All three roles confirm report drafts explicitly. The fictional guide awaits approval.

### P2: if time allows

17. **Voice endpoints.** **Agree with Persons 1 and 3.** `POST /api/audio`, `GET /api/audio/:id`, optional `audioId` on a report. Text keeps working if voice fails.
18. ~~Demo identity hardening~~: superseded by real accounts.
19. **Deployment support**: run/reset instructions for Person 3 (see the phone-access item above).
20. **Accuracy test support**: run the ~20 fictional messages through the real pipeline with Person 3.

## Edge cases to test (from both drafts)

Duplicate reports, wrong zone, ambiguous text, nobody eligible, decline, offer never acknowledged, resolved after escalation, AI failure or timeout, AI returns invalid or malicious JSON, late AI result after the incident is resolved (an existing test covers this; keep it), two people acting on the same incident at once, invalid input never creating an incident.

## Decisions the team still owns (don't decide silently)

1. ~~Grouping/Split/Merge vs. original plan~~: decided 7 Oct, original plan chosen.
2. Auto-offer to volunteers without Mo's approval, and for which categories.
3. Skills, availability and per-zone minimums; the cluster threshold.
4. ~~Double-click local mode~~: replaced by the server. Stack decided: Node + JSON file. **Still open:** how phones reach the server (deploy vs LAN).
5. Jev/OpenRouter and their initial output contracts are settled in `docs/AI-PLAN.md`; guide approval and live access remain pending.

When a decision is made, record it in `PROJECT.md` → Decisions, with the date and reason.

## Working rules

- Branch from the latest `main` (e.g. `armaan/server`). Commit small working steps and open a PR for a teammate to review. Run `npm test` before each push.
- Don't edit Person 1's `src/js/ui/` or `index.html`/CSS beyond agreed contract changes, or Person 3's provider adapters; coordinate instead.
- Update `docs/STARTER-CONTRACT.md` whenever the API or shapes change, and `PROJECT.md` → Status with only things actually tested.
- Keep the "never claim it works without showing it" rule from `AGENTS.md`: report test output and manual check results honestly.
