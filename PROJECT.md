# PROJECT.md: <TODO: team name>

*Project memory: share with each new chat and update after each session. Event facts below come from [HACKATHON.md](HACKATHON.md) and official pages checked on 7 October 2026; official announcements take precedence. Product details below are the team's current direction. The limited text starter has been checked; the full proposed product has not been implemented.*

## Team
- Names and roles: <TODO: assign names to the three-person work split in [roles.md](roles.md)>.
- All members have coded before and have an undergraduate computer science background.
- All members have GitHub accounts. Each member has a ChatGPT or Claude Pro subscription; which person uses which tool is not recorded.
- Event requirement: 3–4 people; each person on one team only; every member needs a ticket.

## What we're building
- Official challenge: "Build an AI-powered product that helps Fieldday successfully deliver Riverside at a scale they've never operated before."
- Project name and tagline: <TODO: team to decide>.
- Track: **Track 3, Ground Control (Crew & Safety Operations), confirmed by the team on 7 October 2026.** Submission of the track-selection form has not been verified.
- Users and problem: festival-goers and volunteers report on-site issues. Safety volunteers need assignments they can assess and escalate; Mo, the safety lead, needs to see urgent, stalled and mounting issues without approving every routine field assessment.
- Current MVP direction: a browser app with public/volunteer incident reporting; a direct assignment offer to an eligible safety volunteer; volunteer acknowledgement, arrival, proposed resolution or escalation; Mo's alert queue and a zone map showing report counts and unresolved work. An incident stays open until Mo, its assigned volunteer or its original reporter explicitly confirms resolution. There is no automatic timeout or closure. The team is also considering volunteer voice reports, worker redistribution suggestions and a public help map.
- Proposed AI role: the team means TypeSafe AI's Jev. It can suggest a report category and choose from volunteers already checked for skills, availability, other assignments and zone coverage. An eligible volunteer can be offered an assessment without Mo's prior approval. The volunteer makes the first on-site safety judgement; Mo handles urgent, unclear, repeated or escalated situations and can manually follow up on unacknowledged offers. AI cannot confirm resolution. The team is open to another model if a tested option is better suited; Jev API access remains unverified.

## Decisions
- 6 October 2026: Recorded Track 3 and an issue-classifier concept as tentative interests, not final product decisions.
- 7 October 2026: The team moved away from a rostering-focused proposal toward incident intake, volunteer assignment and escalation. Reason: route incoming reports to people who can act and let Mo focus on larger or accumulating problems.
- 7 October 2026: The team proposed Jev sending assignment offers directly to eligible safety volunteers. Volunteers would assess and escalate when needed; Mo would not approve every small assignment. This is the current design direction, not a verified safety workflow.
- 7 October 2026: The team raised a public map of volunteer/staff locations, incident uploads, a heatmap, redistribution suggestions, and web-app voice messages as possibilities. Whether to show individual live locations or replace radios remains undecided; the [MVP draft](docs/INCIDENT-MVP-DRAFT.md) uses fixed public help points and zone-level staff information until live-location accuracy can be established.
- 7 October 2026: The team confirmed Track 3 and TypeSafe AI's Jev as the intended decision model, while leaving room to compare alternatives if needed. The MVP will run in a browser; exact target browsers remain to be tested.
- 7 October 2026: The team decided Mo, the assigned volunteer or the original reporter may confirm resolution. Every incident stays open until one of them explicitly confirms; no timeout automatically escalates or closes it.
- 7 October 2026: After reviewing the Armaan branch and discussing a three-person split, the team requested a starting point on main. Added a local text-report workflow with separate interface, incident-domain and analysis-adapter files. This does not settle whether all of Armaan's proposed scope changes are accepted; the original direction above and Armaan's revision still need reconciliation.

## Registration and track checklist — Wednesday 7 October 2026, 5:00pm

HACKATHON.md states: "both forms close **Wed 7 Oct, 5:00pm**. Use the same team name on both." This is **today**, relative to 7 October 2026, not tomorrow. Thursday 8 October at 5:00pm is the Devpost submission deadline.

- [ ] Confirm 3–4 members, each on one team, and a [ticket for every member](https://events.humanitix.com/affinda-ai-innovation-challenge).
- [ ] Agree on the team name: <TODO>.
- [x] Team chooses a track using the [Track Guide](https://groovy-prune-775.notion.site/Affinda-AI-Innovation-Challenge-Track-Guide-3ef1e973de588137b302fd544dfc1a76): Track 3. The selection form is still unchecked below.
- [ ] One person submits the [team registration form](https://forms.gle/kL6HoJAnumiAe8Ry8). Responsible member / completion: <TODO>.
- [ ] One person submits the [track selection form](https://forms.gle/71QCPtin8XqmcvLf7), using the same team name. Responsible member / completion: <TODO>.

## Event requirements
- All work must happen between Opening Night and the submission deadline; no pre-existing projects.
- The Fieldday case is fictional: use fictional sample data, not real personal data.
- Disclose the main AI tools used; current record: Codex for the starter implementation, role review and verification; other team tools: <TODO>. Every member should be able to explain the product.
- If choosing Ground Control: "Every decision about people's safety stays with a person."
- Submit on Devpost by **Thursday 8 October 2026, 5:00pm**: one submission per team with every member added; project name, tagline and track; working prototype link or clear trial steps; public demo video up to five minutes with commentary; short description covering the problem, audience, product, AI use, ideas considered and choice, and tools used.
- A draft is not a submission; late submissions are not accepted. Submission links must stay public and unchanged until judging finishes.

## Status
- Checked: the official Track 3 page, judging rubric, Hacker Hub and Devpost requirements were read live; TypeSafe AI's Jev quick start was read; the [incident MVP draft](docs/INCIDENT-MVP-DRAFT.md) has been written and reviewed for consistency with the team's latest direction.
- Starter checked on 7 October: seven Node.js workflow tests passed. Browser automation through a local HTTP preview verified typed submission, shared state between the two demo views, acknowledgement and escalation remaining open, explicit Mo resolution, urgent ordering, escaped report text and a 390px-wide layout. Direct file opening and physical phones have not yet been tested.
- Implemented: `index.html`, fictional volunteers/zones, a local in-memory incident service, Mo's queue/detail view, volunteer reporting and original-reporter resolution controls, explicit human action history and an honestly labelled analysis stub. Reports reset on refresh and are not shared across tabs or devices. See [roles.md](roles.md) and [the starter contract](docs/STARTER-CONTRACT.md).
- Not implemented or verified: registration/track form completion, real server/storage/authentication, automatic assignment and volunteer offers, eligibility/coverage checks, real Jev/model calls, grouping and Split/Merge, audio/transcription, spoken alerts, public reporting/map and deployment. Model/service access remains unverified.
- Next step: teammates try the starter, assign names to roles, and reconcile the current direction with Armaan's revision. Agree the missing contracts and safety/eligibility rules, then implement a shared server behind the text workflow before adding real AI and voice.

## Traps
- The original generic classifier and the earlier rostering proposal are superseded as current build directions; keep them as ideas considered, not current requirements.
- Track 3 is confirmed; live individual-location design and replacing radios are still undecided. Do not silently treat the MVP draft's other implementation choices as team decisions.
- A paid chat subscription does not by itself establish Jev or transcription API access or credits. Verify access before depending on either integration; keep API keys out of shared code.
- Every safety report must reach a person: a safety volunteer for assessment or Mo when no eligible volunteer is available. Direct assignment must not hide urgent or unclear reports from Mo.
- A volunteer's proposed resolution and an escalation are still open states. Only an explicit confirmation by Mo, the assigned volunteer or the original reporter closes an incident; no timeout does so.
- The starter's role selector is a demonstration, not authentication. Its analysis adapter performs no model call or grouping. Do not describe it as live dispatch, shared storage or a completed safety system.

## Links
- [Hacker Hub](https://groovy-prune-775.notion.site/Affinda-AI-Innovation-Challenge-Hacker-Hub-3f01e973de58814e8252e20bd9d81f5b)
- [Devpost submissions and rules](https://affinda-challenge.devpost.com/)
- [Discord announcements and questions](https://discord.gg/DZgMfVRfr)
- Team repository: https://github.com/luhoulinpeter/affinda-hackathon-2026 (private; teammates need invitations).
- Current [incident response MVP draft](docs/INCIDENT-MVP-DRAFT.md).
- Prototype / demo video: <TODO>.
