# Track 3 proposal: Relay

Prepared 7 October 2026. AI-generated proposal for team evaluation; this is not an approved product decision. No prototype has been built or tested. A lower-cost GPT-5.6 Luna subagent reviewed the concept twice.

## Recommendation

Build a phone-friendly tool for the volunteer coordinator that turns an informal absence or delay message into a checked replacement request for one imminent shift gap. The coordinator approves the request, a volunteer responds, and the coordinator confirms that coverage has actually been restored.

Working description: **A volunteer drops out. Relay helps you find an eligible replacement and follow through until the gap is covered.**

Start with one direct replacement. Do not build a complete roster generator or incident-response platform.

## What was verified live

Read the main Track Guide, all three individual track pages, the full judging rubric, Hacker Hub, Devpost overview and Devpost rules in the browser on 7 October. The web search reader could not load these pages; the browser did. Discord announcements and registration form contents were not inspected.

### Challenge and tracks

Fieldday is a fictional five-person Melbourne events company delivering Riverside: three riverfront days, 60 artists, 40 vendors, 300 volunteers and up to 15,000 attendees per day. It has ten weeks; failing the readiness condition two weeks before the event triggers a costly production-company takeover. The hackathon asks for a working AI-powered product addressing one specific user and problem. Narrow scope is explicitly allowed; plausible details and fictional inputs may be supplied by teams.

- **Track 1 — Backstage:** Jess and production manager Ravi; requirements arrive through riders, certificates, emails and changing run sheets. The difficult work is reconciling information and propagating changes across artists, vendors and equipment. Ravi works primarily through his phone and inbox; vendors may prefer calls or have limited English.
- **Track 2 — Front Row:** festival-goers; arrival, finding friends, changes, accessibility and getting home. Constraints include low battery, patchy signal, noise, one-handed use and varied language/access needs.
- **Track 3 — Ground Control:** Mo and the volunteer coordinator; matching availability and skills, replacing no-shows, handling swaps and breaks, and retaining incident information. Existing coordination uses group chats and radio. Mo is on foot; volunteers need short messages. Radio reports are transient, noisy and jargon-heavy.

Track 3 offers five directions: creating rosters, repairing rosters, interpreting incoming reports, preparing for possible incidents, and carrying out approved actions. These are options, not a requirement to build all five. Its human-control constraint is explicit: “Every decision about people's safety stays with a person.” The suggested scenarios include missing first-aid volunteers during heat and an approaching storm over a crowded outdoor stage. These are prompts, not compulsory demo scenarios.

### Judging

| Criterion | Points | Detailed components |
|---|---:|---|
| Problem understanding | 15 | Specific user/moment 8; difficult constraints 7 |
| Product thinking | 15 | Focus/trade-offs 8; alternatives considered 7 |
| Use of AI | 25 | Meaningful contribution 15; responsible use 10 |
| User experience | 15 | Fit to context 8; clarity/trust 7 |
| Originality | 15 | Beyond obvious 10; creative AI use 5 |
| Execution and communication | 15 | Working prototype 10; clear explanation 5 |

Each subcriterion receives 100%, 80%, 60%, 40% or 20% of its points for Exceptional, Strong, Solid, Partial or Weak respectively. The same rubric applies to screening and finals. Chatbots and dashboards are not automatically penalised. No projected score is justified before building and testing.

### Deadlines and submission

- Team registration and track selection: **Wednesday 7 October, 5pm AEDT**. One member completes the two forms with the same team name.
- Submission: **Thursday 8 October, 5pm AEDT**, on Devpost. A saved draft does not count; every teammate must be added.
- Include name/tagline, track, working prototype link or run instructions, a publicly viewable video of at most five minutes with commentary, and a description covering the problem/user, product, AI/person roles, alternatives, and tools. Repository and slides are optional.
- Finalists are announced Friday 9 October at 2pm on Discord; finals are 6–9pm in person, with a five-minute pitch/demo and questions.
- Teams are 3–4 current Australian university students; each needs a ticket and may join only one team. All project work must fall between Opening Night and submission. Use fictional personal data, disclose major tools, and keep submitted links public and unchanged through judging.
- The rules require the team's own ideas, decisions and judgement. Treat this document as an explicitly AI-generated candidate; evaluate and adapt it yourselves and accurately disclose assistance.

## Evaluation of the options

These are design assessments, not judge predictions or evidence of market novelty.

| Option | Strength | Main weakness | Assessment |
|---|---|---|---|
| Original: classify issues as AI-resolvable or needing a worker | Simple to prototype; close to the team's starting idea | Categories lack a defined boundary; labelling does not finish a task; mistaken dismissal can hide an issue | Too broad as currently described |
| Radio-to-incident handoff | AI has a substantial language-processing job | Noisy audio, duplicate reports and missed incidents make correctness difficult; scope can expand rapidly | Plausible if narrowed to text reports and human-reviewed records |
| Volunteer readiness review before the event | Strong fit for interpreting availability and certificate information | Document intake can consume time; less direct connection to the team's interest in live issues | Useful alternative |
| Relay: one shift-gap replacement | Concrete user, trigger and completed workflow; practical to test | Replacement matching is conventional software; AI benefit and usability must be demonstrated | Recommended candidate |

Track 1 would also support a concrete reconciliation workflow. Track 2 requires particularly careful testing of accessibility and connectivity assumptions. Nothing in the rubric intrinsically favours Track 3; the recommendation follows the team's interest and the bounded workflow available there.

## The smallest useful workflow

**Proposed fictional demo:** A volunteer scheduled for gate support at 14:00 sends, “Train stuck. Can't make two, maybe half past. Can still do the later shift.”

1. **Interpret the message.** AI identifies the relevant shift and the reported delay. It preserves the message as evidence. “Maybe half past” remains tentative; the later shift remains unchanged. If the date, person or shift is unclear, ask one targeted question and wait for an answer. No guessed availability becomes a roster fact.
2. **Check candidates.** Conventional code filters the roster using coordinator-entered availability, role eligibility, existing assignments, break rules and coverage constraints. Missing eligibility evidence excludes a candidate from automatic proposal. AI does not invent certificates, staffing minima or rest requirements.
3. **Show one replacement request.** Display the gap, proposed person, time window, reason they qualify based on recorded information, and any affected coverage. The first version considers only a direct replacement who creates no other staffing gap. If none exists, leave the gap visible and report no eligible replacement.
4. **Approve contact.** The coordinator reviews a short AI-drafted request. The prototype delivers it to an explicitly simulated volunteer inbox only after approval. No live WhatsApp, SMS or radio integration is required.
5. **Track the outcome.** The volunteer accepts or declines. Acceptance means willingness, not presence. Coverage remains pending until the coordinator confirms arrival or handover. Recheck eligibility and roster changes before each commitment; stale proposals must be refreshed.

The primary view is a compact action card, with the original message and evidence available beside or beneath it. Use a small vocabulary: **open, request pending, accepted—coverage pending, coordinator confirmed**. Declines reopen the gap; conflicts block the proposal and keep the gap open. Record who approved and confirmed each change.

Messages outside the supported staffing workflow remain visible for human attention. The system must not dismiss a report because it failed to recognise a staffing issue. It does not provide medical instructions or independently decide how an incident should be handled.

## Where the AI earns its place

The AI's role is interpreting messy, conditional human language, identifying missing information, connecting a report to the right shift, and drafting a concise request. The deterministic checks handle eligibility and scheduling. Their separation makes mistakes easier to inspect.

The strongest criticism is that this could still be a roster app with an unnecessary language model. Test that criticism directly: compare manual reading and roster lookup against the tool on unseen fictional messages. Record task time, corrections and whether the coordinator reaches the correct outcome. Report observed results only. A good demo must include ambiguity or a correction, not just a perfectly formatted absence.

## Build scope and sequence

1. Agree on one role, the shift representation and fictional eligibility/coverage rules. Create a small fixture roster and expected outcomes before implementing.
2. Build the direct-replacement logic and coordinator/volunteer flow using manual input first. Check decline, no-candidate and stale-state behaviour.
3. Connect a real model to extract structured proposals and draft requests. Keep credentials on a server, validate outputs, and retain manual entry if the AI call fails. API access, credits, latency and cost are not verified yet; do not treat paid chat subscriptions as proof that the application can call a model.
4. Test unfamiliar messages, phone-sized use and concurrent roster changes. Run the full workflow from a fresh session and prepare the demo and submission.

Suggested work split: one teammate on interface, one on roster/state logic, one on AI interpretation and fixtures; a fourth can focus on independent testing and the demonstration. For three people, rotate testing across each other's work.

Leave out full-festival optimisation, two-person swaps, live radio transcription, actual messaging services, live maps and autonomous incident triage. The review identified multi-person handovers as the largest unnecessary scope risk, so they were removed from the first version.

## Acceptance checks

- Supported facts cite their input; uncertain arrival times remain uncertain; negation and later unaffected shifts are preserved.
- Ambiguous identity/date/shift requires clarification. Unsupported report types remain visible.
- A proposed replacement satisfies every configured eligibility, availability, overlap, break and coverage rule; unknowns are not silently treated as valid.
- No eligible person results in an explicit unresolved gap.
- Coordinator rejection or volunteer decline never modifies the roster as though the gap were filled.
- A volunteer accepting a request does not mark them physically present.
- A roster change invalidates a stale proposal; simultaneous requests cannot double-book a person.
- No contact occurs before approval; no final coverage change occurs before confirmation. Failed model calls preserve the original input and expose manual handling.
- New text is processed by the model; demo outputs are not canned. Simulated messaging is labelled clearly.

## Candid assessment

Strong potential fit on problem focus, testability and human control. Meaningful AI use is plausible but unproven. Originality is the weakest area because roster repair is explicitly suggested in the brief and the underlying task is familiar. The distinguishing implementation would be faithful interpretation of uncertainty and a complete request-to-confirmation workflow. Neither market uniqueness nor time saved has been established.

Recommended next decision: accept, change or reject this exact workflow before building. In particular, decide whether the volunteer coordinator's replacement task is the problem your team actually wants to solve.

## Sources inspected live

- [Main Track Guide](https://groovy-prune-775.notion.site/Affinda-AI-Innovation-Challenge-Track-Guide-3ef1e973de588137b302fd544dfc1a76)
- [Track 1: Backstage](https://groovy-prune-775.notion.site/Track-1-Backstage-3ef1e973de5881bab277c5ec32fe7d0e)
- [Track 2: Front Row](https://groovy-prune-775.notion.site/Track-2-Front-Row-3ef1e973de588144833ef29cf88d6ee7)
- [Track 3: Ground Control](https://groovy-prune-775.notion.site/Track-3-Ground-Control-3ef1e973de58817ea2dee33e7e267787)
- [Detailed judging rubric](https://groovy-prune-775.notion.site/Judging-criteria-3ef1e973de58814fb3ffe493d04367dd)
- [Hacker Hub](https://groovy-prune-775.notion.site/Affinda-AI-Innovation-Challenge-Hacker-Hub-3f01e973de58814e8252e20bd9d81f5b)
- [Devpost overview and submission requirements](https://affinda-challenge.devpost.com/)
- [Devpost rules](https://affinda-challenge.devpost.com/rules)
