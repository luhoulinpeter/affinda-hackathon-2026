# Hi-Vis submission handover

The runnable project and judge instructions are prepared. This file is a handover, not confirmation that Devpost has been submitted.

## Prepared materials

- Project: **Hi-Vis**. Track: **Track 3 — Ground Control**, chosen by the team.
- Working prototype trial instructions: [README.md](README.md), with the full walkthrough and demo credentials in [JUDGES.md](JUDGES.md).
- Portable archive: run `npm run package:submission` to produce `dist/hi-vis-submission.zip`. Share the archive or a repository judges can actually access; the current team repository is private.
- Verification record: [SUBMISSION-READINESS.md](docs/checks/SUBMISSION-READINESS.md).
- Existing video assets remain in the team workspace at `docs/demo/`, outside this handover archive. The 64-second MP4 is an earlier, edited screenshot replay with captions and old branding. It has no spoken commentary and is not the finished current submission video.

## Description facts the team can use

Hi-Vis supports event-goers reporting on-site issues, volunteers accepting assignments, and Mo, the safety lead, reviewing and coordinating incidents. The prototype includes three role-based workspaces, an incident map, configurable fictional zones and first-aid pins, sensitive-information handling, volunteer availability and acceptance, and decorative assignment progress. Arrival and resolution require explicit human confirmation.

In the configured application, TypeSafe Jev suggests category, urgency and sensitivity and screens questions for possible safety issues. Free OpenRouter Nemotron generates report summaries, sourced informational answers and advisory volunteer rankings. Reports remain available if a provider fails. Server permissions restrict the records provided to Q&A and prevent AI from assigning or resolving incidents. The keyless judge demo substitutes explicitly labelled deterministic providers, a schematic map and fictional GPS so it can run without the team's private keys.

Tools used in the recorded implementation: Codex for coding, independent review and automated/browser checks; TypeSafe Jev (`jev-latest`); free OpenRouter (`nvidia/nemotron-3-super-120b-a12b:free`); Google Maps; Node.js; FFmpeg for the historical replay. Team to add other tools used. Do not claim the simulated judge demo is live inference or that phone background tracking has been implemented.

## Team must complete before submission

HACKATHON.md records “A **working prototype**: a link, or clear steps to try it” and “A **demo video**, up to 5 minutes, with commentary, at a **public link**.” It also says “Links must stay public and unchanged” until judging finishes.

- [ ] Team name and all 3–4 members added to the Devpost submission: `<TODO: team>`.
- [ ] Team-chosen tagline: `<TODO: team>`.
- [ ] Team's explanation of ideas considered and why this product was chosen: `<TODO: team>`.
- [ ] Team reviews/edits the description facts above and adds its own problem explanation and other tools used.
- [ ] Upload a current demo with commentary, no longer than five minutes; paste a public viewing link: `<TODO: team>`.
- [ ] Provide a public, stable download/repository link for the prepared archive and clear trial steps, or a lasting hosted prototype link: `<TODO: team>`. A temporary trycloudflare.com address is not a permanent deployment.
- [ ] Open the final download/prototype and video links in a private browser window without the team's account; verify access and playback.
- [ ] Confirm registration/track forms and any later organiser instructions. Their completion is not verified in this chat.
- [ ] Submit on Devpost by **Thursday 8 October 2026, 5:00pm Melbourne time**. A draft is not a submitted entry.

No credentials or accounts for Devpost/video hosting were requested. Nothing has been uploaded, published or submitted by this preparation step. Keep `.env` and `.riverside/` private; the package script excludes both.
