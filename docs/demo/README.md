# Recorded incident workflow

Open [replay.html](replay.html) or play [incident-demo.mp4](incident-demo.mp4). The local preview uses `node scripts/serve-demo-replay.cjs`, then http://127.0.0.1:8767/replay.html on the Mac. The MP4 is portable and does not need the app server or a Maps key to play.

This is a **64-second edited replay of actual browser screenshots**, not a continuous screen recording. Captions and chapter buttons cover attendee report submission → Mo's incident pin and details → manual offer to Priya → Priya's acceptance → grey dotted path gaining white fill → Mo and attendee views → explicit human arrival control. Screens were captured through the browser UI; form submission, offer and acceptance used the real application controls.

The recording ran the existing application against a separate temporary store with fictional accounts and coordinates. A labelled, sandbox-only browser geolocation fixture supplied University of Melbourne coordinates; classification and summary providers were simulated. Movement used the existing Mo-controlled 90-second simulator. Google Maps rendered real basemap tiles. No real phone GPS or live AI inference was tested. No live reports, accounts, API allowances or production source files were changed. The recording server was stopped after capture.

Measured checks are in [verification.json](verification.json): exactly one report, Priya assigned, Mo/volunteer progress both 1, incident still open and assistance still accepted at full progress, stored destination unchanged, separate guest unable to retrieve incident or volunteer pins. The attendee's actual screen shows the fixed starting marker and progress without a moving volunteer marker.

Playback verification: full MP4 decoded without errors; H.264 at 1280×720, 64 seconds, 1,194,332 bytes, with selectable English subtitles. Actual browser playback and chapter seeking passed. Preview range request returned 206 with the requested 32 bytes; an out-of-range request returned 416 and `.env` returned 404. Original full application suite remains 152/152 from the preceding milestone; application code is unchanged by this recording.

To make another take, run `node --env-file=.env scripts/recording-demo.cjs`. It prints a loopback URL and writes randomly generated fictional account credentials only to ignored `.riverside/recording-access.json`. Sign into separate tabs with those accounts, go available as Priya, submit a report, offer/accept, then start Mo's demo movement. After 90 seconds, `node scripts/verify-recording-demo.cjs` checks the first incident. Saved screenshot scenes can be encoded again with `node scripts/build-demo-replay.cjs` (requires the already-installed FFmpeg). Do not point the recording sandbox at the live store or expose it through the public tunnel.

Tools used for this artifact: Codex, browser automation, Node.js and FFmpeg. The preview is loopback-only; it is not a new public deployment.
