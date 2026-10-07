# Riverside incident response: MVP draft

**Status:** Updated 7 October 2026. The team chose this original direction and set Armaan's revision aside. A limited text-report starter with public reporting and real local staff accounts has been built and checked; assignment, AI, voice and maps remain planned. See PROJECT.md for current verification and remaining decisions.

## One-sentence product

A festival-goer or volunteer reports an issue in a browser; Jev offers it directly to an eligible safety volunteer for human assessment, while serious, unclear or growing situations also reach Mo. The incident stays open until Mo, the assigned volunteer or its reporter explicitly confirms resolution.

**Primary users:** safety volunteers handling reports and Mo, the safety lead, overseeing exceptions and patterns. **Other users:** festival-goers submitting reports. This keeps the core product in Ground Control even though it has a public reporting view.

## The one complete journey to build first

1. **Report.** A festival-goer opens a phone-friendly page, selects a named zone on a small festival map, chooses a broad issue type, writes a short description and can flag immediate concern. The page confirms that the report was received and gives its reference number. A volunteer can use the same form; their identity and assigned zone are prefilled in the demo.
2. **Voice option for volunteers.** The volunteer may record a short voice message. A transcription service produces editable text; the volunteer checks it before sending. Text entry always remains available. Treat a radio report as another source that a coordinator can enter manually; direct radio capture is outside this first build.
3. **Route and offer.** The app keeps the source report visible, filters fictional safety volunteers by recorded skill, availability, current assignment and minimum zone coverage, then lets Jev choose among eligible candidates. It immediately offers the task to one volunteer, without waiting for Mo to approve each routine field assessment. If the report contains an explicit urgent signal, is unclear, or no eligible volunteer exists, Mo is alerted as well; it never disappears from the queue.
4. **Human response.** The volunteer accepts or declines. After accepting, they assess the situation in person, report what they found, propose that it is resolved within their training and event protocol, or escalate to Mo. An offer or acceptance is not proof that anyone has reached the location.
5. **Resolution confirmation.** Mo may follow up and confirm resolution. The assigned volunteer may confirm what they resolved, or the festival-goer who submitted the report may confirm that their issue is resolved. Record who confirmed and when. Until one of these people confirms, the incident stays open, including after an escalation or a volunteer's proposed resolution. There is no automatic timeout or closure.
6. **Mo's oversight.** Mo sees all reports and the zone heatmap but is actively alerted for urgent reports, volunteer escalation, declined offers, repeated related reports, or a zone showing a growing cluster. Unacknowledged offers remain visible for manual follow-up; no timer automatically escalates or closes them. Mo decides on any larger safety response and may override assignments. Actions and times remain in the incident record.

**Demonstration story:** A festival-goer reports a minor hazard in Zone B. Jev offers it to an eligible safety volunteer, who accepts and records an in-person assessment. A second report and a volunteer voice note describe crowd pressure near the same zone. The map now shows a growing cluster and Mo receives an alert. Mo reviews the original reports, overrides any inadequate assignment and decides the response. Use clearly fictional people and festival zones.

## Three small screens

| Screen | First-version content |
|---|---|
| Public help and report | Three-zone sketch map, fixed staffed help points, short report form with an immediate-concern flag, truthful report status and a way for that reporter to confirm resolution. Do not display individual staff locations as live GPS when only roster zones are known. |
| Mo's operations view | All reports with a focused alert list for urgent, unclear, declined and clustered cases; simple zone heatmap; source text/audio; assigned responder, override and confirm-resolution controls. Show **open and unacknowledged** counts separately from confirmed resolutions. |
| Volunteer view | Assigned zone, one-tap report form with optional voice, incoming offers, accept/decline, arrived, propose or confirm resolution, and escalate-to-Mo controls. |

The heatmap shows report volume and unresolved work by zone using recent fictional events. It helps Mo spot where to look; it does not declare a zone safe or unsafe. Suggested redistribution is one proposed responder move with a before/after coverage preview, rather than a separate optimiser.

## Jev's proposed role

The team confirmed **TypeSafe AI's Jev**. Its official quick start describes fixed-choice, yes/no and score outputs from a text `state` and defined questions. It does not produce a transcript or free-form explanation. Its proposed jobs here are: suggest a report category from a small set and choose one candidate from a list of **already eligible safety volunteers**. The app's own rules determine eligibility and whether a move leaves another zone short. The Jev choice can send an assignment offer without Mo's prior approval. It does not decide the medical, crowd or other safety response, and it cannot confirm resolution. The volunteer is the first person to assess the situation; Mo takes over when the case is serious, unclear, repeatedly reported or escalated. Show Jev's choice beside the original report for later human review and correction. Another model may be used if a tested option fits this bounded job better; transcription requires a separate speech tool.

No Jev access, pricing or performance has been verified for this team. An API key, if used, must stay on a server, not in a public web page or repository.

**Audio has a separate path:** the browser records the note, a transcription service creates text, and Jev receives that text after the speaker has checked it. The browser's built-in speech recognition is a lighter experiment if the team cannot access a transcription service, but it may not retain the original audio and has uneven support. Paid chat subscriptions do not establish application API access. The target phone/browser must be tested and the text form must remain usable.

## Human decision and escalation rules

- Every report is assigned to a human for assessment or shown to Mo when no qualified volunteer can take it. A volunteer may resolve only what their training and event protocol permit; they can escalate to Mo at any point. Jev never decides that a possible safety issue needs no person.
- Explicit urgent signals in the report, an urgent flag chosen by the reporter, unclear information, and reported crowd pressure alert Mo immediately, even if a volunteer is also offered the task. Automatic routing must not delay that alert.
- An assignment offer is not a completed dispatch. A volunteer must acknowledge it, mark arrival and record an outcome. Acceptance is not the same as arriving or resolving the incident.
- Mo gets renewed attention if an offer is declined, contradicted by a later report, or part of a growing cluster in one zone. Unacknowledged offers stay open and visible for manual follow-up. There is no automatic timeout for assignment, escalation or incident closure. All reports remain visible to Mo, even without an alert.
- An incident reaches **confirmed resolved** only when Mo, its assigned volunteer or its original reporter explicitly confirms it. The app records the confirmer and time; a model suggestion, assignment, arrival, proposed resolution or escalation is never enough to close it.
- The public page directs people to the fixed staffed help point or existing emergency channels for immediate help. Do not promise that a submitted web report brings an instant response.

## Data and the smallest implementation

Use three invented site zones, a small fictional roster with names, roles, skills, assigned zones and availability, plus several realistic reports. Store each report's source, time, zone, status, suggested category, assignment, acknowledgement, proposed outcome and explicit resolution confirmation. Deliver the MVP as a browser app; the first demo can use a role switch in one browser to show all three views. Exact desktop and mobile browsers still need checking. Real multi-user accounts, GPS tracking and live messaging are not needed to prove the workflow.

Build in this order:

1. **Core text journey:** report submission, deterministic eligibility, direct offer to a volunteer, acceptance/decline, arrival, proposed resolution or escalation to Mo, and explicit resolution confirmation by Mo, the assigned volunteer or the reporter. Add an obvious urgent flag that alerts Mo at once. Save a working checkpoint and test it with a new report, not only a canned example.
2. **Map and oversight view:** three-zone counts, unresolved/acknowledgement states and a cluster alert from multiple reports. Show a before/after coverage preview for a worker offered across zones.
3. **Voice input:** record a clip, obtain an editable transcript from a service, then submit. Verify it on a teammate's actual phone and browser. If no transcription service is available, test browser dictation on the target browser; label it as dictation rather than a retained voice note.
4. **Jev connection if accessible:** send report text and the eligible candidate list with fixed questions from a server; use the returned choice for the direct offer on a fresh report. If Jev is unavailable, send the report to Mo or a clearly labelled deterministic fallback; describe Jev as unintegrated rather than faking the call.
5. **Independent check and demo:** test ambiguous, duplicate, wrong-zone, no-eligible-worker, decline, no-acknowledgement, unresolved-after-escalation and model-failure cases. Record a short demonstration of the whole journey.

The first working slice can be a local web app with fictional data and clear run instructions. The final submission needs an accessible prototype link **or** clear steps to run it; the public demo video is separately required.

## Definition of done

- A new fictional text report appears in Mo's queue and in the correct zone count.
- A newly submitted ordinary report is offered to an eligible volunteer without Mo approving it first. Mo can review and override that choice.
- A candidate with the wrong skill, an overlapping assignment or insufficient remaining source-zone coverage is never offered as eligible.
- Jev's returned volunteer ID is checked against the current eligible list immediately before an offer is sent; an invalid or stale choice alerts Mo and leaves the report open.
- Without an eligible responder, the incident remains open and Mo is alerted.
- A volunteer decline returns attention to Mo or another eligible volunteer. An unacknowledged offer remains visibly open for human follow-up. Neither state closes the incident or triggers a timeout.
- An explicit urgent flag or crowd-pressure report alerts Mo immediately, regardless of the volunteer assignment. Repeated reports in one zone create a distinct cluster alert; an isolated routine report does not interrupt Mo.
- A volunteer can record arrival, propose resolution, explicitly confirm their own resolution, or escalate. Mo or the original reporter can also explicitly confirm resolution. The record shows who confirmed and when. A proposed resolution or escalation remains open until confirmed; no AI output or timeout marks the incident resolved.
- If recorded voice notes are included, each submitted note has an editable transcript and its original audio remains available for review. If browser dictation is used instead, the interface does not imply that an audio file exists. Text submission still works if microphone or transcription fails.
- If Jev is included, a real call routes unfamiliar text and chooses among eligible volunteers; the volunteer's and Mo's subsequent decisions remain visible. A missing Jev response does not hide or silently close the report.
- The heatmap counts are derived from stored reports and change when a new report or resolution changes the state.
- All sample people and incidents are fictional; no credentials appear in client code.

## Decisions the team still owns

1. Choose the first report type a safety volunteer may assess, which signals alert Mo immediately, and the skill required. Define the minimum coverage that a move must preserve.
2. Verify Jev API access and compare it with alternatives only if access, latency or tested decision quality becomes a problem.
3. Decide who monitors Mo's alert queue and what pattern of related reports counts as a growing cluster. No incident or assignment timeout is planned.
4. Choose and test the exact desktop and phone browsers, especially for microphone access and voice transcription.

**Time-sensitive event facts:** Team registration and track selection close **7 October 2026 at 5:00pm AEDT**. Devpost submission closes **8 October 2026 at 5:00pm AEDT**. The official rules require fictional data, disclosure of major AI tools and human control of safety decisions.

## References

- [Official Ground Control brief](https://groovy-prune-775.notion.site/Track-3-Ground-Control-3ef1e973de58817ea2dee33e7e267787)
- [Official TypeSafe AI Jev quick start](https://docs.typesafe.ai/introduction/quickstart)
- [Browser microphone requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Browser speech recognition limitations](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [Devpost requirements and rules](https://affinda-challenge.devpost.com/rules)
