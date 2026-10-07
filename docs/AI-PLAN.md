# First Jev + Luna integration

Updated 7 October 2026. The team approved this first milestone: report analysis plus Q&A for event-goers, volunteers and Mo, using the current Node.js/browser stack. Armaan's revision remains set aside. The code is implemented and tested with simulated providers; **real provider access and free-credit controls remain unverified**.

| Integration | First milestone | Boundary |
|---|---|---|
| Jev (`jev-latest`) | Category and urgency suggestions from original reports; screen Q&A for possible safety incidents | Fixed choices validated by the server; cannot resolve or dispatch |
| OpenAI Luna (`gpt-6-luna`) | Short report summaries and source-grounded Q&A | Original report remains authoritative; factual answers need permitted sources |
| Speech | Later task | Text remains available |

## Settled decisions

- All three views have Q&A. Public users receive approved public guide entries and their own report information; volunteers receive permitted incidents and staff guidance; Mo receives the full queue and staff guidance.
- Draft a clearly fictional guide for zones, water, toilets, help points and staff reporting/escalation. It is stored in `data/event-guide.json` with `approved:false` until the team approves it. No live web search.
- The last four exchanges remain only in page memory, clear on refresh or identity changes, and are treated as untrusted conversation context. Current incident sources are fetched afresh for each question.
- Possible/unclear safety messages produce an editable draft of the original message. The user selects a zone and confirms; no report is created by asking a question. Mo may also submit these drafts.
- Immediate-concern flags, explicit immediate danger and crowd pressure receive urgent attention. Unclear safety situations remain for Mo's review. AI never downgrades urgent attention, replaces human resolution or delays saving an incoming report.
- Jev and Luna analyse original reports independently in the background. Their results and failures are stored separately; the original reporter's category is preserved.
- Existing free credits only. OpenAI access was reported ready by the user, but neither key is present in the server environment checked during implementation. Jev setup is pending. No real requests were made.

## Connection and failure handling

All provider calls run on the server. Live mode requires a key, explicit enable flag and current operator verification of provider-enforced credit-only hard stops. A persisted attempt allowance supplements those controls; it cannot verify billing itself. No automatic retries; timeouts and busy limits keep failures bounded. See [AI-SETUP.md](AI-SETUP.md) for exact private setup and guide approval steps.

Q&A screens through Jev before asking Luna. Failed screening shows the reporting route; failed answering shows unavailable. Unknown information is explicit. Returned citation IDs must belong to the server's permitted context. Neither model has action tools. Report and document text cannot grant permissions. This reduces exposure but does not prove model accuracy or immunity to instruction injection: real answers still need source checks.

## Ownership and next checks

- Person 1: Q&A panels, sources, drafts, conversation display and phone layout.
- Person 2: scoped context, endpoint, persistence/background analysis and Mo reporting permissions.
- Person 3: adapters, prompts, validators, guide draft and evaluation examples.

Automatic volunteer assignment/eligibility, voice, maps and hosting remain later tasks. Before claiming live integration, verify credit-only access and test a fresh report plus unfamiliar questions with actual providers. Keep the guide inactive until the team approves its fictional facts and staff instructions.
