# Hi-Vis

An event-safety prototype for Riverside: attendees report issues, volunteers accept work, and Mo, the safety lead, coordinates incidents on a map. Built for Track 3, Ground Control, at the Affinda AI Innovation Challenge.

## Try it — no API keys needed

1. Install **Node.js 20 or newer** if it is not already installed. Check with `node --version` in a terminal.
2. Extract the project ZIP. Open a terminal in the extracted `hi-vis` folder (the one containing `package.json`).
3. Run:

   ```sh
   npm run demo
   ```

   Or run `node scripts/judge-demo.cjs` directly. There are no packages to install and no build step.
4. Wait for **Hi-Vis judge demo**, then open **http://127.0.0.1:8766/** in a browser. Keep the terminal open; stop with Ctrl+C.

| Workspace | Username | Password |
|---|---|---|
| Mo — safety lead | `mo` | `mo` |
| Priya — volunteer | `priya` | `priya` |
| Alex — second volunteer | `alex` | `alex` |
| Event-goer | No sign-in | Open a separate new tab |

These credentials belong only to the isolated judge sandbox. Use **Staff sign in** to enter them. The demo page also contains instructions and links to three separate tabs. [JUDGES.md](JUDGES.md) walks through reporting, assignment, privacy, movement and resetting.

**Demo scope:** the real application, account permissions, saved reports, assignments and live update system run locally. AI responses, GPS and the schematic campus map are explicitly simulated. No API credits, internet map tiles or external accounts are required after Node is installed. The demo does not test Google Maps, real GPS or Google walking estimates. Demo records persist in `.riverside/judge-demo/`, separate from the normal app.

To share this fictional demo with phones or other computers, install [Cloudflare's official cloudflared client](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/) and run **`npm run demo:tunnel`**. It prints a temporary HTTPS link and keeps a separate `.riverside/judge-tunnel` sandbox. Anyone with the link can use the displayed demo accounts. Keep the host awake and terminal open; Ctrl+C stops both processes. [Tunnel steps and troubleshooting](JUDGES.md#share-the-demo-by-https-quick-tunnel).

## Run the normal application

Judges with privately supplied Maps/AI keys: follow **[LIVE-TESTING.md](LIVE-TESTING.md)** for the complete fresh-computer setup and checks. The normal app retains real integrations; demo mode always substitutes simulations.

```sh
npm start
```

Open http://127.0.0.1:8765/. First-time setup creates your own Mo account; Mo creates volunteer accounts. **The judge credentials are not installed in this mode.** The normal store is `.riverside/store.json`.

For Google Maps and optional live AI, copy `.env.example` to `.env`, supply your own keys, and follow [SETUP.md](SETUP.md) and [server/README.md](server/README.md). With Node 20.6 or newer, run `node --env-file=.env server/index.cjs` to load that file. A browser Maps key is visible to browsers; restrict it to your approved origins/APIs. Live AI also needs an operator-approved persisted allowance. Routes estimates are disabled by default and require separate configuration. Never share `.env` or `.riverside/`.

A local address opens on the computer running the server. Phones need HTTPS hosting/tunnel setup. Quick Tunnel links are temporary; this project does not include permanent public hosting. The normal app needs private credentials for public deployment; shared judge credentials are only for the explicitly fictional `demo:tunnel` sandbox. Keep one Node process and a persistent writable data directory; this JSON-store MVP is not a serverless deployment.

## Verify and package

```sh
npm test
npm run package:submission
```

Tests use isolated data and simulated providers. Packaging writes `dist/hi-vis-submission.zip` with source, tests and instructions; it excludes private stores, API keys, Git history and local configuration. [Submission checklist](SUBMISSION.md) distinguishes the prepared project from the team information, public video and Devpost submission still required.

## Implementation and limits

Plain HTML/CSS/JavaScript, Node's built-in HTTP server, server-enforced roles, scrypt password hashes, tab-specific sessions and a local JSON store. No npm dependencies. The runtime integrates TypeSafe Jev for classification/screening and free OpenRouter Nemotron for summaries, sourced Q&A and advisory volunteer ranking. Humans accept assignments and explicitly confirm arrival/resolution; AI cannot close an incident. Sensitive information is assigned privately by the safety lead.

The map uses fictional first-aid stations and event zones around the University of Melbourne. Attendees see only their assigned responder's starting ping and decorative dotted progress, not their live position. Volunteers share while the page remains open until Pause/sign-out; native background tracking is outside this MVP. Broader AI accuracy, physical phone GPS reliability, load capacity and permanent hosting remain unverified. Recorded checks and historical milestones are in [submission verification](docs/checks/SUBMISSION-READINESS.md).

Tools used include Codex for implementation/review/tests, TypeSafe Jev, OpenRouter, Google Maps, Node.js and FFmpeg for the historical demo replay. The team must add any other tools used to its submission. [HACKATHON.md](HACKATHON.md) records the event requirements; all product choices belong to the team.
