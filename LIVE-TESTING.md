# Hi-Vis — test the real Maps and AI integrations

Use this path to test the normal application with keys supplied privately by the team or owned by the tester. The keyless judge demo is a separate startup mode; adding keys does **not** enable real services in `npm run demo` or `npm run demo:tunnel`.

## What is shared and separate

| Mode | Start command | Map / AI / location | Saved data |
|---|---|---|---|
| Normal app | `node --env-file=.env server/index.cjs` | Google Maps / real configured providers / browser GPS | `.riverside/` |
| Keyless local demo | `npm run demo` | Labelled schematic / simulated AI / fictional GPS | `.riverside/judge-demo/` |
| Keyless HTTPS demo | `npm run demo:tunnel` | Labelled schematic / simulated AI / fictional GPS | `.riverside/judge-tunnel/` |

These modes share the same core interface, server permissions and incident workflow. The demo launcher injects its alternative map/GPS scripts and simulated providers; normal startup never injects them. Demo accounts/passwords belong only to the demo stores. Real provider adapters and the Google renderer remain in the source package.

## Fresh-computer setup

1. Extract `hi-vis-submission.zip`; open a terminal inside its `hi-vis` folder. Install **Node.js 20.6 or newer**. No npm install or build is needed.
2. Make a copy of `.env.example` named **`.env`** in that folder. Edit it in a text editor. Keep `PUBLIC_ORIGIN`, `MO_USERNAME`, `MO_PASSWORD`, `PORT` and `RIVERSIDE_DATA_DIR` blank for this local test.
3. Paste the supplied keys into the matching fields. Enable only the AI providers whose owner has authorised calls:

   ```dotenv
   GOOGLE_MAPS_API_KEY=<Maps JavaScript browser key>
   TYPESAFE_API_KEY=<TypeSafe Jev key>
   OPENROUTER_API_KEY=<OpenRouter key>
   OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
   RIVERSIDE_JEV_ENABLED=true
   RIVERSIDE_OPENROUTER_ENABLED=true
   ```

   Replace the complete placeholders, including angle brackets. A missing provider can remain blank with its enable flag `false`. OpenRouter is restricted to the pinned free model and zero-price routing, without paid fallback. Leave Google Routes disabled for this walkthrough; the basemap, pins and dotted progress work without it.
4. **Record the API owner's actual authorisation.** Create a folder named `.riverside` and save **`.riverside/ai-credit-verification.json`** using the JSON structure in [SETUP.md](SETUP.md#optional-live-ai). Use a stable unique ID and actual consent timestamp for each authorised provider; include only those providers. For the sample ongoing approval, the owner must have authorised existing Jev credit use/free OpenRouter use and reported setting API-side limits. Do not fabricate that confirmation or copy the team's private approval/store files. This approval file is required in addition to keys and enable flags. Keep IDs stable on later runs so cumulative usage is retained. A command to print the current timestamp is `node -p "new Date().toISOString()"`.
5. Run:

   ```sh
   node --env-file=.env server/index.cjs
   ```

6. Open **http://127.0.0.1:8765/** on that same computer. Click **Staff sign in** and complete the first-time Mo account setup using your own credentials. Mo creates Priya/Alex accounts under **Volunteer accounts**. The public demo passwords are not automatically created in normal mode.
7. Keep that terminal running. After editing keys or approval configuration, stop with **Ctrl+C** and run the same command again. Staff sign in again after restart; accounts, reports and cumulative usage persist.

Keep supplied keys private: share them with judges separately, never in the public ZIP/repository or screenshot. API keys stay in `.env`; normal accounts and usage records stay in `.riverside`. The Google browser key is necessarily visible to browsers and must be restricted to the intended site/API. A server-only Routes key must never be used as `GOOGLE_MAPS_API_KEY`.

## Confirm that real services are selected

- **Page identity:** the normal app has no **JUDGE DEMO · Simulated…** banner. If that banner appears, you are on a demo server; switch to the normal app's printed address.
- **Maps:** expect an actual Google basemap with Google attribution and zone/first-aid pins, rather than the labelled campus schematic. This uses **Maps JavaScript API**, not Maps Embed API. The key must permit the test origin and have Maps JavaScript access/remaining quota. A previously exhausted Demo Key cannot be repaired by changing app code; its owner needs an available permitted key or must wait for its allowance to reset. Retry map retains report text.
- **AI status:** the page's Jev/OpenRouter status must show enabled availability without **simulated**. A disabled status explains missing configuration/approval or exhaustion. An enabled status confirms configuration selection; a successful provider result is still needed to establish current service availability.
- **One small real check:** submit a fictional ordinary report with **Use demo location** and **Send report only**. This normally requests one Jev classification and one OpenRouter summary, consuming the provider's allowance. Mo can inspect the original report and completed/failed analysis. If a provider fails or refuses the request, the original remains available; it is not silently replaced by simulated output. Do not repeat a failing test automatically.
- **Assignment map:** sign in as an available volunteer in a separate tab, let Mo offer the report, accept it, and check the frozen starting marker/dotted progress. Normal mode uses the volunteer's browser GPS. Denied/unavailable GPS is a real-device limitation; fictional **Use demo location** only replaces the requester's position. Mo's existing **Start / restart demo movement** control explicitly simulates the journey if used; it does not establish actual GPS tracking.
- **Q&A/ranking:** each deliberate use can request additional real AI calls. They remain limited to permitted records and eligible volunteers. General event-guide answers stay disabled until the team reviews and approves that guide; incident status answers use accessible reports. Mo still approves first-aid configuration separately.

For phone tests, configure HTTPS/public access as described in [SETUP.md](SETUP.md#phones-and-independent-hosting). `127.0.0.1` on a phone refers to the phone itself. `demo:tunnel` shares the simulated demo, not this normal-app instance. New-device HTTPS, GPS permissions and key restrictions must be checked on the actual device/site.

## Verification boundaries

The source package includes tests for the normal provider adapters, real HTTP routes, environment/approval gates, persisted call counting, free-only OpenRouter routing, Maps configuration/renderer and role privacy. Routine tests substitute provider network responses and GPS; they do not spend credits or establish present provider availability. Basic live provider calls and Google map loading were observed during development. The team's Google Demo Key later reached its daily quota; successful fresh Google recovery has not been verified. Supplying a different key still requires its owner to configure access/quota correctly.

Optional real Google walking estimates need a separate server Routes key, enable flag and agreed call limit; see [SETUP.md](SETUP.md#optional-starting-walking-estimate). No live estimate is promised by this setup.
