# Three-person starting point

This working split follows the team's discussion on 7 October. Replace Person 1–3 with names. The starter implements the shared text-report workflow; it does not establish that every change in Armaan's revised proposal has been accepted. Agree the remaining scope together and record it in PROJECT.md.

| Owner | Files to start in | Responsibility | First next step |
|---|---|---|---|
| Person 1: interface | `index.html`, `src/css/app.css`, `src/js/ui/app.js` | Mo and volunteer views, form validation feedback, recording and transcript editing later | Try the text flow, then improve the two views without changing the service contract |
| Person 2: application/server | `src/js/domain/incidents.js`, `data/fixtures.js`, `server/`, `tests/incidents.test.cjs` | Authoritative state, permitted actions, assignment and coverage rules, incident history | Add the server API behind the existing interface; agree roster eligibility rules before implementing offers |
| Person 3: AI/services | `src/js/services/analysis.js`, new service-specific files in `server/`, AI evaluation tests | Model adapter, transcription adapter, audio storage connection, grouping evaluation and deployment setup | Verify service access, then agree validated results with Person 2 before replacing the stub |

Person 2 owns the server entry point and shared configuration. Person 3 adds provider adapters in separate files. Keep API keys on the server, never in browser scripts. Person 1 owns shared HTML and CSS; coordinate changes rather than editing the same files simultaneously.

## Work together first

1. Read [the implemented contract](docs/STARTER-CONTRACT.md). Agree future offer states, grouping corrections, roster rules and voice endpoints before building them separately.
2. Everyone opens `index.html` and tries report → Mo review → acknowledgement → escalation → explicit human resolution. The demo is one tab; it does not sync devices.
3. Create a task branch from the latest `main`, for example `codex/mo-view`, `codex/incident-api` or `codex/ai-adapter`. Commit small working steps and open a pull request for a teammate to review.
4. Merge a working text slice first, then real AI, then voice. Test the combined app after each merge; do not wait for a single large checkpoint merge.

Everyone tests on their own phone once a server preview is available. Person 1 collects submission text and AI-tool disclosures; Person 2 supplies run/reset instructions; Person 3 prepares the demo recording with the others. Record the main AI tools in PROJECT.md as work progresses.

## Not yet implemented

Server or shared storage, real sign-in, automatic assignment, volunteer offers/acceptance/arrival, skills or coverage checks, real AI, grouping, Split/Merge, audio/transcription, spoken alerts and deployment. These are handover tasks, not working features. The team still owns which proposed features to keep.
