# Riverside incident response: MVP draft

**Status:** Draft for the team to evaluate, 7 October 2026. This document records the direction discussed in chat; it is not a claim that the team has finalised Track 3 or built a prototype. `PROJECT.md` has not been changed for this draft.

## One-sentence product

A festival-goer or volunteer reports an issue; Jev offers it directly to an eligible safety volunteer for human assessment, while serious, unclear or growing situations also reach Mo. The system tracks acknowledgement, escalation and resolution.

**Primary users:** safety volunteers handling reports and Mo, the safety lead, overseeing exceptions and patterns. **Other users:** festival-goers submitting reports. This keeps the core product in Ground Control even though it has a public reporting view.

## The one complete journey to build first

1. **Report.** A festival-goer opens a phone-friendly page, selects a named zone on a small festival map, chooses a broad issue type, writes a short description and can flag immediate concern. The page confirms that the report was received and gives its reference number. A volunteer can use the same form; their identity and assigned zone are prefilled in the demo.
2. **Voice option for volunteers.** The volunteer may record a short voice message. A transcription service produces editable text; the volunteer checks it before sending. Text entry always remains available. Treat a radio report as another source that a coordinator can enter manually; direct radio capture is outside this first build.
3. **Route and offer.** The app keeps the source report visible, filters fictional safety volunteers by recorded skill, availability, current assignment and minimum zone coverage, then lets Jev choose among eligible candidates. It immediately offers the task to one volunteer, without waiting for Mo to approve each routine field assessment. If the report contains an explicit urgent signal, is unclear, or no eligible volunteer exists, Mo is alerted as well; it never disappears from the queue.
4. **Human response.** The volunteer accepts or declines. After accepting, they assess the situation in person, report what they found, resolve a matter within their training and event protocol, or escalate to Mo. An offer or acceptance is not proof that anyone has reached the location.
5. **Mo's oversight.** Mo sees all reports and the zone heatmap but is actively alerted for urgent reports, volunteer escalation, missing acknowledgement, repeated related reports, or a zone showing a growing cluster. Mo decides on any larger safety response and may override assignments. Actions and times remain in the incident record.

**Demonstration story:** A festival-goer reports a minor hazard in Zone B. Jev offers it to an eligible safety volunteer, who accepts and records an in-person assessment. A second report and a volunteer voice note describe crowd pressure near the same zone. The map now shows a growing cluster and Mo receives an alert. Mo reviews the original reports, overrides any inadequate assignment and decides the response. Use clearly fictional people and festival zones.

## Three small screens

| Screen | First-version content |
|---|---|
| Public help and report | Three-zone sketch map, fixed staffed help points, short report form with an immediate-concern flag, and a truthful report status. Do not display individual staff locations as live GPS when only roster zones are known. |
| Mo's operations view | All reports with a focused alert list for urgent, unclear, stalled and clustered cases; simple zone heatmap; source text/audio; assigned responder and override controls. Show **open and unacknowledged** counts separately from total reports. |
| Volunteer view | Assigned zone, one-tap report form with optional voice, incoming offers, accept/decline, arrived, resolve-with-notes and escalate-to-Mo controls. |

The heatmap shows report volume and unresolved work by zone using recent fictional events. It helps Mo spot where to look; it does not declare a zone safe or unsafe. Suggested redistribution is one proposed responder move with a before/after coverage preview, rather than a separate optimiser.

## Jev's proposed role

Assuming “Jev” means **TypeSafe AI's Jev**, its official quick start describes fixed-choice, yes/no and score outputs from a text `state` and defined questions. It does not produce a transcript or free-form explanation. Its proposed jobs here are: suggest a report category from a small set and choose one candidate from a list of **already eligible safety volunteers**. The app's own rules determine eligibility and whether a move leaves another zone short. The Jev choice can send an assignment offer without Mo's prior approval. It does not decide the medical, crowd or other safety response, and it cannot close the report. The volunteer is the first person to assess the situation; Mo takes over when the case is serious, unclear, stalled, repeated or escalated. Show Jev's choice beside the original report for later human review and correction.

No Jev access, pricing or performance has been verified for this team. An API key, if used, must stay on a server, not in a public web page or repository.

**Audio has a separate path:** the browser records the note, a transcription service creates text, and Jev receives that text after the speaker has checked it. The browser's built-in speech recognition is a lighter experiment if the team cannot access a transcription service, but it may not retain the original audio and has uneven support. Paid chat subscriptions do not establish application API access. The target phone/browser must be tested and the text form must remain usable.

## Human decision and escalation rules

- Every report is assigned to a human for assessment or shown to Mo when no qualified volunteer can take it. A volunteer may resolve only what their training and event protocol permit; they can escalate to Mo at any point. Jev never decides that a possible safety issue needs no person.
- Explicit urgent signals in the report, an urgent flag chosen by the reporter, unclear information, and reported crowd pressure alert Mo immediately, even if a volunteer is also offered the task. Automatic routing must not delay that alert.
- An assignment offer is not a completed dispatch. A volunteer must acknowledge it, mark arrival and record an outcome. Acceptance is not the same as arriving or resolving the incident.
- Mo gets renewed attention if an offer is declined, unacknowledged after the team's chosen time window, contradicted by a later report, or part of a growing cluster in one zone. The team must choose the time and cluster windows; none has been invented here. All reports remain visible to Mo, even without an alert.
- The public page directs people to the fixed staffed help point or existing emergency channels for immediate help. Do not promise that a submitted web report brings an instant response.

## Data and the smallest implementation

Use three invented site zones, a small fictional roster with names, roles, skills, assigned zones and availability, plus several realistic reports. Store each report's source, time, zone, status, suggested category, assignment, acknowledgements and final outcome. The first demo can use a role switch in one browser to show all three views. Real multi-user accounts, GPS tracking and live messaging are not needed to prove the workflow.

Build in this order:

1. **Core text journey:** report submission, deterministic eligibility, direct offer to a volunteer, acceptance/decline, arrival, resolution or escalation to Mo. Add an obvious urgent flag that alerts Mo at once. Save a working checkpoint and test it with a new report, not only a canned example.
2. **Map and oversight view:** three-zone counts, unresolved/acknowledgement states and a cluster alert from multiple reports. Show a before/after coverage preview for a worker offered across zones.
3. **Voice input:** record a clip, obtain an editable transcript from a service, then submit. Verify it on a teammate's actual phone and browser. If no transcription service is available, test browser dictation on the target browser; label it as dictation rather than a retained voice note.
4. **Jev connection if accessible:** send report text and the eligible candidate list with fixed questions from a server; use the returned choice for the direct offer on a fresh report. If Jev is unavailable, send the report to Mo or a clearly labelled deterministic fallback; describe Jev as unintegrated rather than faking the call.
5. **Independent check and demo:** test ambiguous, duplicate, wrong-zone, no-eligible-worker, decline, no-acknowledgement and model-failure cases. Record a short demonstration of the whole journey.

The first working slice can be a local web app with fictional data and clear run instructions. The final submission needs an accessible prototype link **or** clear steps to run it; the public demo video is separately required.

## Definition of done

- A new fictional text report appears in Mo's queue and in the correct zone count.
- A newly submitted ordinary report is offered to an eligible volunteer without Mo approving it first. Mo can review and override that choice.
- A candidate with the wrong skill, an overlapping assignment or insufficient remaining source-zone coverage is never offered as eligible.
- Jev's returned volunteer ID is checked against the current eligible list immediately before an offer is sent; an invalid or stale choice alerts Mo and leaves the report open.
- Without an eligible responder, the incident remains open and Mo is alerted.
- A volunteer decline or no acknowledgement returns attention to Mo or another eligible volunteer; neither closes the incident.
- An explicit urgent flag or crowd-pressure report alerts Mo immediately, regardless of the volunteer assignment. Repeated reports in one zone create a distinct cluster alert; an isolated routine report does not interrupt Mo.
- A volunteer can record arrival, resolve within their role, or escalate. No AI output marks the incident resolved; acceptance alone never does.
- If recorded voice notes are included, each submitted note has an editable transcript and its original audio remains available for review. If browser dictation is used instead, the interface does not imply that an audio file exists. Text submission still works if microphone or transcription fails.
- If Jev is included, a real call routes unfamiliar text and chooses among eligible volunteers; the volunteer's and Mo's subsequent decisions remain visible. A missing Jev response does not hide or silently close the report.
- The heatmap counts are derived from stored reports and change when a new report or resolution changes the state.
- All sample people and incidents are fictional; no credentials appear in client code.

## Decisions the team still owns

1. Confirm Track 3 and whether this is the intended problem, rather than rostering.
2. Confirm that “Jev” means TypeSafe AI's model and whether the team can call it from an application.
3. Pick which report types a safety volunteer may assess first, which signals alert Mo immediately, and the skill required for each report type. Define the minimum coverage that a move must preserve.
4. Choose the acknowledgement timeout and the time/zone rule for a growing cluster. Decide who monitors Mo's alert queue.
5. Decide which target phone/browser to support for the voice demonstration.

**Time-sensitive event facts:** Team registration and track selection close **7 October 2026 at 5:00pm AEDT**. Devpost submission closes **8 October 2026 at 5:00pm AEDT**. The official rules require fictional data, disclosure of major AI tools and human control of safety decisions.

## References

- [Official Ground Control brief](https://groovy-prune-775.notion.site/Track-3-Ground-Control-3ef1e973de58817ea2dee33e7e267787)
- [Official TypeSafe AI Jev quick start](https://docs.typesafe.ai/introduction/quickstart)
- [Browser microphone requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Browser speech recognition limitations](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [Devpost requirements and rules](https://affinda-challenge.devpost.com/rules)
