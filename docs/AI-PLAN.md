# Jev + OpenRouter integration

Updated 7 October 2026. The team approved this first milestone: report analysis plus Q&A for event-goers, volunteers and Mo, using the current Node.js/browser stack. Armaan's revision remains set aside. The code has simulated tests and basic live verification; **live verification is recorded in PROJECT.md; model reliability and provider billing hard stops remain unverified**.

| Integration | First milestone | Boundary |
|---|---|---|
| Jev (`jev-latest`) | Category and urgency suggestions from original reports; screen Q&A for possible safety incidents | Fixed choices validated by the server; cannot resolve or dispatch |
| OpenRouter Nemotron 3 Super (`nvidia/nemotron-3-super-120b-a12b:free`) | Short report summaries and source-grounded Q&A | Original report remains authoritative; factual answers need permitted sources |
| Speech | Later task | Text remains available |

## Settled decisions

- All three views have Q&A. Public users receive approved public guide entries and their own report information; volunteers receive permitted incidents and staff guidance; Mo receives the full queue and staff guidance.
- Draft a clearly fictional guide for zones, water, toilets, help points and staff reporting/escalation. It is stored in `data/event-guide.json` with `approved:false` until the team approves it. No live web search.
- The last four exchanges remain only in page memory, clear on refresh or identity changes, and are treated as untrusted conversation context. Current incident sources are fetched afresh for each question.
- Possible/unclear safety messages produce an editable draft of the original message. The user selects a zone and confirms; no report is created by asking a question. Mo may also submit these drafts.
- Immediate-concern flags, explicit immediate danger and crowd pressure receive urgent attention. Unclear safety situations remain for Mo's review. AI never downgrades urgent attention, replaces human resolution or delays saving an incoming report.
- Jev and the LLM analyse original reports independently in the background. Their results and failures are stored separately; the original reporter's category is preserved.
- Use only verified existing credits; do not buy more or enable automatic recharge. The Jev console showed $5 available with recharge off on 7 October; a TypeSafe key is now present locally. The user has authorised a bounded live local session; see PROJECT.md for actual results. The user has now chosen OpenRouter free models instead of direct OpenAI/Luna or a ChatGPT subscription connection. OpenRouter uses a separate key and free-only routing; no live calls have been made.
- **Latest authorisation:** small live Jev/OpenRouter checks and bounded interactive use are permitted; use at most five automatic calls per provider per work session by default. Notify before large/batch/load runs with scope/count/cost, and ask before expanding agreed allowances or substantial/new costs. A key alone is not approval. Never exhaust credits to test billing behaviour, buy more credits or enable recharge. Do not auto-renew allowances. See the persistent rules in `AGENTS.md`, `CLAUDE.md` and [AI-SETUP.md](AI-SETUP.md).

## Connection and failure handling

All provider calls run on the server. Live mode requires a key, an explicit enable flag and a current private record for a bounded approved test. Jev requires either actually verified credit-only hard stops or the separately authorised existing-credit mode (recharge off, at least $1 checked balance, at most 20 calls); OpenRouter enforces pinned free IDs and zero-price routing, and its record requires `freeOnlyConfirmed` and `liveTestApproved`. Old Luna flags/proofs do not activate OpenRouter. A persisted attempt allowance supplements those controls; it cannot verify billing itself. No automatic retries; timeouts and busy limits keep failures bounded. See [AI-SETUP.md](AI-SETUP.md) for exact private setup and guide approval steps.

Q&A screens through Jev before asking the LLM. Failed screening shows the reporting route; failed answering shows unavailable. Unknown information is explicit. Returned citation IDs must belong to the server's permitted context. Neither model has action tools. Report and document text cannot grant permissions. This reduces exposure but does not prove model accuracy or immunity to instruction injection: real answers still need source checks.

## OpenRouter selection

The default is NVIDIA Nemotron 3 Super (free), with reasoning disabled and short structured outputs. Public metadata confirms free pricing and schema support; live quality observations are recorded separately in PROJECT.md; latency is not benchmarked. No paid fallback or automatic retry is allowed. The user reports purchasing $10 of OpenRouter credits; free models still have minute/day quotas. See [model research](OPENROUTER-MODELS.md). Persisted `analysis.luna`/`session.ai.luna` fields remain compatibility slots; the UI identifies OpenRouter or AI summaries and the new allowance ledger uses `openrouter`.

## Ownership and next checks

- Person 1: Q&A panels, sources, drafts, conversation display and phone layout.
- Person 2: scoped context, endpoint, persistence/background analysis and Mo reporting permissions.
- Person 3: adapters, prompts, validators, guide draft and evaluation examples.

Automatic volunteer assignment/eligibility, voice, maps and actual hosting remain later tasks. Before claiming live integration, record read-only billing checks and follow the latest bounded live-use authorisation in AI-SETUP.md. Keep the guide inactive until the team approves its fictional facts and staff instructions.

## Implemented GPS assistance extension

The later approved [GPS assistance workflow](GPS-ASSISTANCE.md) adds deterministic nearest-volunteer offers after explicit submission, separate from Jev/OpenRouter. Jev adds `first_aid_information` screening; configured station lookup bypasses the LLM and uses its own Mo approval. Existing general guide approval and AI budget controls are unchanged. Earlier statements that all assignment is deferred are superseded for this slice; real phone GPS and hosting remain unverified.
