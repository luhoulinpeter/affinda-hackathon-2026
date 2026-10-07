# Three-person starting point

This working split follows the team's discussion on 7 October. Replace Person 1–3 with names. The team chose [the original plan](docs/INCIDENT-MVP-DRAFT.md) and set Armaan's revision aside. Keep the public/event-goer, Volunteer and Mo views, with the public page as the default and staff views determined by sign-in.

| Owner | Files to start in | Responsibility | First next step |
|---|---|---|---|
| Person 1: interface | `index.html`, `src/css/app.css`, `src/js/ui/` | Public, Mo and volunteer views, account entry, report feedback; planned LLM Q&A interface and voice/transcript editing | Agree Q&A audience/placement, then extend the existing views without changing permissions |
| Person 2: application/server | `server/`, `src/js/services/api.js`, `src/js/domain/incidents.js`, `data/fixtures.js`, `tests/` | Account sessions, server permissions, role-scoped LLM context retrieval, authoritative state, assignment/coverage rules and history | Agree the stack and Q&A context contract; add offers after agreeing eligibility rules |
| Person 3: AI/services | `src/js/services/analysis.js` (server-side), new provider files in `server/`, AI evaluation tests | Separate Jev and LLM adapters/prompts, interpretation and less urgent Q&A, transcription, audio storage and AI evaluation | Verify both providers and agree sources/validated results with Person 2 before replacing the stub |

Person 2 owns the server entry point and shared configuration. Person 3 adds provider adapters in separate files. Keep API keys on the server, never in browser scripts. Person 1 owns shared HTML and CSS; coordinate changes rather than editing the same files simultaneously.

See [the AI plan](docs/AI-PLAN.md) for Jev/LLM boundaries and unresolved Q&A decisions. The team kept the Node.js server and JSON file store (no database) on 7 October.

## Work together first

1. Read [the implemented contract](docs/STARTER-CONTRACT.md). Agree future offer states, roster rules, map/cluster rules and voice endpoints before building them separately.
2. Run `node server/index.cjs` and open `http://127.0.0.1:8765/`. Try public report → staff sign-in → Mo review → explicit human resolution. Create the first Mo account locally, then volunteer accounts from Mo's view. The running server shares persisted state between its browser sessions.
3. Create a task branch from the latest `main`, for example `codex/mo-view`, `codex/incident-api` or `codex/ai-adapter`. Commit small working steps and open a pull request for a teammate to review.
4. Merge a working text slice first, then real AI, then voice. Test the combined app after each merge; do not wait for a single large checkpoint merge.

Everyone tests on their own phone once a server preview is available. Person 1 collects submission text and AI-tool disclosures; Person 2 supplies run/reset instructions; Person 3 prepares the demo recording with the others. Record the main AI tools in PROJECT.md as work progresses.

## Not yet implemented

Automatic assignment, volunteer offers/acceptance/arrival, skills or coverage checks, real Jev/LLM calls, interpretation/Q&A, maps/zone counts/cluster alerts, audio/transcription, spoken alerts and public deployment. Server storage, real staff accounts and public reporting are implemented. Armaan's grouping/Split/Merge revision is set aside.
