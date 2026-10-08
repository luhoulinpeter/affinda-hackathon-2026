# Hi-Vis — judge quick start

## Start on a fresh computer

Requires Node.js 20 or newer and a modern browser. No npm install, database, API keys, account registration or build step is required for this demo.

1. Extract `hi-vis-submission.zip` and open a terminal inside `hi-vis`.
2. Run `node --version`. If Node is missing or below version 20, install Node first.
3. Run `npm run demo` (or `node scripts/judge-demo.cjs`).
4. Wait for the URL printed by the server, normally **http://127.0.0.1:8766/**. Open it on that same computer. Keep the terminal running.
5. Expand **Demo sign-ins & instructions** at the top. Its links open independent event-goer, Mo and volunteer tabs. Use fresh tabs rather than duplicating an already signed-in tab.

| Person | Sign-in username | Password | What they see |
|---|---|---|---|
| Mo, safety lead | `mo` | `HiVis-Mo-Demo!` | All incidents, map, assignment controls and configuration |
| Priya, volunteer | `priya` | `HiVis-Priya-Demo!` | All incident pins, details for offers/accepted work |
| Alex, volunteer | `alex` | `HiVis-Alex-Demo!` | A second volunteer for availability/claim tests |
| Event-goer | None | None | Public zones/first aid and own report history |

Click **Staff sign in**, enter the two fields, then submit. Each tab keeps its own identity. A server restart signs staff out; the accounts and submitted records persist.

## Walk through one incident

1. **Volunteer tab:** sign in as Priya. Click **Go available**. The demo supplies a fictional campus GPS fix, so no browser permission popup is expected. Wait for **Available for offers**.
2. **Event-goer tab:** leave **Use my location** selected. Type `Fictional spill beside the water tent; the walkway is slippery.` Choose **Hazard** and click **Send report only**. Note the incident reference. This creates a report without automatically requesting attendance.
3. **Mo tab:** sign in as Mo. The incident pin and queue entry appear. Select the pin or queue entry. In **Offer to a volunteer**, select Priya and click **Send volunteer offer**. The optional suggested ranking is also simulated in this demo; it does not assign anyone.
4. **Volunteer tab:** click **Accept offer**. The accepted assignment and details appear. The map now joins the frozen starting ping to the incident with a dotted curve.
5. **Mo tab:** select that incident and click **Start / restart demo movement**. Over 90 seconds the grey dots gain white fill. Keep tabs open. The volunteer and Mo see simulated movement; the attendee sees only the starting ping and dotted progress.
6. At full progress the incident stays open. **Mark arrived** and **Confirm resolved** are explicit human actions, independent of the animation. Once Priya resolves, location sharing stays active and she becomes available again until she clicks **Pause**.

The map is a bounded schematic, not street navigation. Its pins and curves use the application's real role-filtered data. It has no zoom/pan. Google Maps and Google walking estimates require the separately configured normal app; this demo makes no Google or AI requests.

## More useful cases

- **Request attendance directly:** with Priya available, submit a new report using **Send & request volunteer**. An offer should appear for an eligible volunteer; acceptance is still required. The explicit **Use demo location · fictional** choice also works without requester GPS.
- **Busy volunteer keeps seeing work:** while Priya has an assignment, submit another ordinary report. Mo sees both. Priya sees the new pin but cannot read unrelated details or accept a second assignment.
- **Newly available volunteer:** open another volunteer tab with `/?demo-role=volunteer`, sign in as Alex, click **Go available**, and use **Choose an incident** to accept an eligible waiting ordinary incident. Alternatively Mo can send Alex an offer. Two volunteers cannot own the same incident.
- **Sensitive information:** submit a report with **Contains sensitive information** selected. Mo sees its text and assigns it personally; it is absent from the public volunteer claim list. Unassigned volunteers cannot read its details. The demo classifier also flags words such as `harassment`; this is a deterministic simulation, not proof of model accuracy.
- **Ask Hi-Vis:** ask `What is the current incident status?` to receive a simulated, cited overview limited to that user's permitted records. Ask `There is a spill beside the water tent` to prepare an unsubmitted safety draft. Confirming the draft is a separate action.
- **Zones and first aid:** click A/B/C or a first-aid pin. A zone offers **Use this zone**. Mo can edit zone/station configuration; saved changes appear for attendees. Zone reports use approximate reference points.
- **Clear between demonstrations:** Mo opens **Demo controls → Clear reports & incidents…**, types uppercase `CLEAR`, then confirms. This removes only the sandbox's incident workflow and pauses volunteers. Accounts, zones, stations and cumulative counters are retained. Cancel leaves everything intact. Q&A has its own clear-history control.

## Troubleshooting

- **Port already in use:** stop your earlier judge demo with Ctrl+C. To choose another port on macOS/Linux: `HIVIS_DEMO_PORT=8770 npm run demo`. On PowerShell: `$env:HIVIS_DEMO_PORT='8770'; npm run demo`.
- **Cannot connect:** check the terminal is still running and use the exact printed URL. The judge launcher listens only on this computer; opening that address on a phone reaches the phone itself.
- **Login not recognised:** use this demo's printed URL and passwords, not the normal app on port 8765. Restart invalidates staff sessions; sign in again.
- **Records from an earlier run:** they are intentionally saved. Use Mo's confirmed clear control before starting a fresh walkthrough.
- **Need real integrations:** follow the normal-app section in [README.md](README.md) and [server/README.md](server/README.md). Do not expose the judge launcher publicly or reuse these shared passwords in a public deployment.

## Evidence and boundaries

See [submission verification](docs/checks/SUBMISSION-READINESS.md) for measured checks. Fresh-directory testing on the developer's Mac is not proof of Windows/Linux or a physical second device. The team workspace contains a video draft and a historical replay of an earlier app version. They remain outside this judge package and are not a completed current submission video.
