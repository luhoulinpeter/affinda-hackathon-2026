# Hi-Vis — optional real integrations and hosting

The judge demo needs none of this configuration. Use [JUDGES.md](JUDGES.md) for the keyless walkthrough. This guide applies to the normal app started with `npm start`.

For a judge testing with supplied keys on a fresh computer, follow [LIVE-TESTING.md](LIVE-TESTING.md) first. It gives the full local sequence and explains how to distinguish real provider status from the simulated demo.

## Normal local setup

1. Install Node.js 20 or newer. No npm install or build step is needed.
2. Run `npm start`; open http://127.0.0.1:8765/.
3. Click **Staff sign in** and create your own Mo username/password in the one-time setup.
4. Sign in as Mo, open **Volunteer accounts**, choose a fictional roster person and create that person's credentials.
5. Open a separate new tab to sign in as the volunteer. Event-goers need no sign-in.

The normal app saves accounts/reports in `.riverside/store.json`. Judge credentials are not created here. Keep `.riverside/` private and back it up before moving an existing installation. Sessions expire on restart; accounts and reports persist. Do not run two server processes against the same data directory.

## Google Maps

Copy `.env.example` to `.env`. Set `GOOGLE_MAPS_API_KEY` to your own Maps JavaScript API browser key, permitted for your actual site origins. Do not paste a server-only Routes key into that field. The normal custom markers, clickable incidents and dotted curves use the Maps JavaScript API, not the Maps Embed iframe.

With Node 20.6 or newer, stop the normal server and restart it using:

```sh
node --env-file=.env server/index.cjs
```

`.env` is not automatically loaded by `npm start`. Without a working Maps key, reporting and assignments still work; the map shows a fallback message. Judge mode ignores `.env` and always uses its labelled schematic.

## Optional live AI

Supply your own `TYPESAFE_API_KEY` and/or `OPENROUTER_API_KEY` in `.env`. The pinned model is `nvidia/nemotron-3-super-120b-a12b:free`; the adapter rejects paid model IDs. Enabling a flag alone is insufficient: the server also checks a private operator approval record in the normal data directory's `ai-credit-verification.json`.

After the API account owner explicitly authorises calls and sets provider limits, an ongoing record has this structure. Replace the placeholder IDs and timestamps with your own records of actual consent; this example itself grants no approval:

```json
{
  "jev": {
    "id": "<your-stable-jev-approval-id>",
    "approvalMode": "ongoing",
    "approvedAt": "<actual ISO approval timestamp>",
    "providerLimitsReportedByUser": true,
    "existingCreditUseApproved": true
  },
  "openrouter": {
    "id": "<your-stable-openrouter-approval-id>",
    "approvalMode": "ongoing",
    "approvedAt": "<actual ISO approval timestamp>",
    "providerLimitsReportedByUser": true,
    "freeOnlyConfirmed": true,
    "liveTestApproved": true
  }
}
```

Only include providers you have authorised. Set the matching `RIVERSIDE_JEV_ENABLED=true` or `RIVERSIDE_OPENROUTER_ENABLED=true`, then restart with `.env` loaded. Set `revoked:true` on the relevant record or disable its flag to revoke. Every attempted call is counted persistently under the original ID; do not reset IDs to erase usage. Ongoing approval has no local call ceiling and relies on your provider controls; the app cannot verify your remaining balance. Bounded approval is also supported in `server/ai/approval.cjs`.

Jev classifies/safety-screens; OpenRouter summarises/answers/ranks. Missing keys, invalid approval, quota errors and provider failures leave original reports intact. General event-guide answers remain disabled while `data/event-guide.json` has `approved:false`; configured first-aid lookup has separate Mo approval. Review fictional guide content before approving it.

## Optional starting walking estimate

This integration is disabled by default. If the account owner approves any applicable Google costs, configure a separate, server-only `GOOGLE_ROUTES_API_KEY`, `RIVERSIDE_GOOGLE_ROUTES_ENABLED=true` and an explicitly agreed positive integer `RIVERSIDE_GOOGLE_ROUTES_MAX_CALLS` (maximum 1000). Attempts reserve a cumulative persisted counter. No credit purchase or recharge is performed by the app.

The app requests one starting walking estimate per accepted assignment per server run. Distances below two minutes display **Up to 2 minutes**. Movement and elapsed time do not refresh the estimate; arrival remains a human action. Zone-only and fictional demo-location destinations do not request Google estimates. Restarting clears estimate caches but preserves cumulative call counts. Missing/failed routing displays an unavailable message rather than an invented ETA.

## Phones and independent hosting

The normal local server binds to `127.0.0.1`; that address works only on the computer running it. Phones need HTTPS and a reachable public origin for geolocation. Physical-phone permissions and GPS reliability remain unverified here.

For an independently hosted deployment, use one long-running Node process with a persistent writable disk. Start with `npm start`, set the host's `PORT`, an exact `PUBLIC_ORIGIN=https://your-own-host.example`, and your private `MO_USERNAME` and `MO_PASSWORD`. Set `RIVERSIDE_DATA_DIR` to the persistent directory. The example domain is a placeholder, not a deployed link. In deployed mode the app binds to all interfaces, accepts only that public host, requires secure cookies and disables browser first-account setup. Mo's credentials are created/updated from the environment on each start. Use your hosting provider's HTTPS termination and secret settings.

The JSON store and in-memory sessions require one process; this version is not suited to stateless functions or multiple replicas. Each password check uses about 128 MB, with at most two concurrent checks. Account recovery/password reset UI is not implemented. The project does not provision hosting, a domain or a permanent URL.

The optional `server/phone-demo.cjs` entry point is for forwarding an already-configured local store through a temporary HTTPS tunnel. It requires an existing Mo account and `RIVERSIDE_PHONE_ORIGIN` set to the tunnel origin, listens only on loopback, and uses polling. Quick Tunnel hostnames are temporary and change when recreated.

For sharing the **fictional judge sandbox**, use `npm run demo:tunnel` instead, after installing the official cloudflared client. It creates a separate simulated sandbox with public demo sign-ins, secure cookies and exact-host checks. See [JUDGES.md](JUDGES.md#share-the-demo-by-https-quick-tunnel). Do not forward the ordinary `npm run demo` server directly, or use public demo passwords with real data.
