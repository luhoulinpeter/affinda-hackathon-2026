> Historical proposal: set aside by the team. See PROJECT.md and docs/AI-PLAN.md for the current direction; merging this file does not adopt its scope.

# Revised MVP proposal: one incident, not nine messages

**Status:** Revision of [INCIDENT-MVP-DRAFT.md](INCIDENT-MVP-DRAFT.md) by Armaan, 7 October 2026, to close gaps against the Track 3 brief and judging criteria. Proposed for the team to accept, change or reject. Nothing has been built or tested.

## What changed and why

| Gap in the current draft | Revision |
|---|---|
| Three users and no concrete moment | One user (Mo) in one moment (Saturday 2pm heatwave). Volunteers are the reporters. |
| The AI only picks from a pre-filtered list, which a simple rule could do | The AI's main job is making sense of noisy reports: deciding which messages describe the same incident, pulling out the zone and urgency, and briefing Mo. Rules can't do this reliably. |
| Mo's view is a dashboard, but Mo is on foot with an earpiece | Mo gets one incident card at a time, plus a short spoken alert in the earpiece. The full list is secondary. |
| Close to the "problem-flagging dashboard" obvious idea | The product turns many messages into fewer, checked incidents. The heatmap and public form are cut. |
| Radio, the real source of noise, was out of scope | Volunteers send short voice notes, which behave like radio but are kept and transcribed. |
| "Every shift covered" was only indirect | Sending a volunteer shows whether it leaves their zone short. |
| Large scope for ~24 hours | Cut the public form, heatmap, redistribution optimiser and GPS. |

Kept from the team's draft: browser app, Jev as the intended model, direct offers to eligible volunteers for routine checks, incidents open until a person confirms resolution, no auto-timeouts, fictional data.

## The moment

**Saturday, 2:00pm, 38°C.** Mo is walking between stages with a radio earpiece and a phone in a pocket. In fifteen minutes, nine messages arrive from volunteers:

- "bloke down near the water tent, mates with him"
- "guy fainted by water, need FA"
- "queue at water station massive, 40+ people, getting pushy"
- "first aid tent only has one person??"
- "someone collapsed near bars, zone B" (the water tent is in Zone B, next to the bars)
- "lost kid at main stage, blue hat, w/ volunteer Priya"
- …and three more variations.

These are really **four incidents**: one person collapsed (three reports), crowding at the water station (two), the first-aid tent short-staffed (two), and a lost child (one). Today Mo hears all nine over the radio and can't tell three reports from three incidents. Messages disappear once said, and the write-up happens the next morning.

## The product in one sentence

Volunteers send a quick voice or text report; AI groups duplicate and related reports into a single incident and briefs Mo in a few words; every incident has a person on it and stays open until a person confirms it's resolved.

## The journey to build first

1. **Report (volunteer).** One tap to record a short voice note, or type. The transcript is shown and editable before sending. The volunteer's zone is prefilled. The original audio is kept.
2. **Make sense of it (AI).** For each new report, the AI:
   - extracts the zone, a category from a small set (medical, crowding, lost person, staffing, hazard, other) and an urgency score;
   - checks it against open incidents with a yes/no question for each ("Does this report describe the same incident as #12?"), then either links it or opens a new incident;
   - updates a one-line brief of at most 12 words (e.g. "Zone B water tent: person collapsed, 3 reports, no responder yet").

   Every link and suggestion is shown next to the original reports. Mo can split a wrongly merged report or merge two incidents with one tap.
3. **Route.**
   - **Urgent** (medical, crowding, lost child, or a high urgency score): Mo hears the brief in the earpiece straight away, and the incident goes to the top of Mo's card.
   - **Routine** (e.g. a spill): offered directly to an eligible volunteer for assessment, as in the team's draft. Mo can see and override it.
   - **Unclear or low confidence:** goes to Mo, never dropped.
4. **Mo acts (one card).** Mo sees only the current top incident: the brief, how many reports, what changed since last look, and big buttons for **Acknowledge**, **Send volunteer**, **Call first aid/emergency**, **Split** and **Resolve**. Choosing who to send shows whether it leaves that volunteer's zone below its minimum.
5. **Close.** Unchanged from the team's draft. Only Mo, the assigned volunteer or the original reporter can confirm resolution. The record shows who and when. A model suggestion, timeout or acceptance never closes an incident.
6. **The write-up comes free.** Each incident keeps its reports, audio, decisions and times. That replaces the next-morning write-up. Optional stretch: a draft incident report that Mo signs off.

## Where the AI earns its place

The hard job is deciding that "bloke down near the water tent" and "someone collapsed near bars, zone B" are the same person, while "queue at water station massive" is a different, related problem. Slang, wrong zone names, typos and partial information defeat keyword rules. This is the "making sense of the noise" direction in the Track 3 brief.

| AI does | People do |
|---|---|
| Transcribe voice notes (speech service) | Volunteer checks the transcript before sending |
| Extract zone, category, urgency | Mo can correct any field |
| Link reports to incidents | Mo can split or merge |
| Write a ≤12-word brief | Mo decides the response |
| Offer routine checks to an eligible volunteer | Volunteer assesses on site; anyone can escalate to Mo |
| — | Every safety decision and every resolution |

**Jev fit:** the team's notes say Jev returns fixed-choice, yes/no and score outputs. That matches the linking ("same incident? yes/no"), category and urgency jobs. The ≤12-word brief needs free-text output, so it needs another model or a template built from the extracted fields. Jev access is still unverified. If it isn't available, use another model and say so; don't fake the call.

**Prove it, don't claim it:** write about 20 fictional messages with a known correct grouping before building. Report how many were grouped correctly, and show at least one mistake in the demo that Mo fixes with Split. That evidence answers "why not just a rule?".

## Fits Mo's real situation

- Mo hears urgent briefs through the earpiece (browser text-to-speech) without taking the phone out.
- The phone shows one card, big buttons and short text. The full incident list is one tap away, not the default.
- Volunteers send voice notes, like radio, instead of filling in a form.
- Nine messages become four incidents, and Mo only needs to act on the top one.

## Human control

Every decision about people's safety stays with a person:
- The AI never decides that a report needs no one. Unclear or low-confidence reports go to Mo.
- The AI can offer a volunteer a routine "go and look" task, but cannot dispatch first aid or emergency services, move a team, or close an incident. **The team should state this line explicitly in the pitch:** asking someone to look is not a safety decision; what happens next is.
- Every AI output sits next to its source reports, and Mo can correct it.

## Cut from this version

Public festival-goer reporting form, zone heatmap, redistribution optimiser, live GPS and direct radio capture. List them under "ideas considered" in the submission, with the reason (focus on Mo's moment).

## Build order (~24 hours)

1. **Fixtures first (1h):** the 20 fictional messages, their correct grouping, a 3-zone site and a ~12-person fictional roster with skills, zones and minimums.
2. **Core loop, text only:** report → AI extract and link → incident card → Mo's actions → explicit resolution. Test on new messages, not only fixtures. Commit.
3. **Mo's experience:** one-card view, spoken brief, Split/Merge, coverage warning when sending someone.
4. **Voice notes:** record, transcribe, edit, send. Test on a teammate's phone. Text must still work if the microphone fails.
5. **Measure and demo:** run the 20 messages, record the grouping accuracy, then record the video.

Suggested split: interface (volunteer and Mo views); incident and roster logic; AI prompts, fixtures and accuracy test; testing and demo video.

## Demo story (≈3 minutes)

1. Saturday 2pm, 38°C: set the scene with Mo on foot.
2. Three volunteers send messages about the collapse in different words, one as a voice note. They become one incident, "3 reports", and Mo hears the brief in the earpiece.
3. A crowding report at the water station is linked as related, not merged. Mo sends a volunteer, and the app warns that Zone C drops below its minimum.
4. The AI wrongly merges one message; Mo fixes it with Split. This shows the person stays in control.
5. A volunteer confirms the collapse is handed to first aid and resolved. The incident record shows every report, decision and time.
6. Close with the accuracy result from the 20-message test.

## Decisions the team still owns

1. Accept, change or reject this revision against the team's current draft.
2. Whether volunteers may receive direct offers without Mo (kept from the draft), and the exact urgent categories.
3. Which model handles linking and briefs if Jev isn't available.
4. Team name, project name and tagline, and the registration and track forms due **today, 7 October, 5:00pm**.
