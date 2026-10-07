# Local application server

Run `node server/index.cjs` from the project root, then open `http://127.0.0.1:8765/`. Requires Node.js 20 or newer. No dependencies need installing.

The server binds to `127.0.0.1` only. `PORT` changes the port; `RIVERSIDE_DATA_DIR` selects a separate data directory (used by browser checks). The default `.riverside/` directory is ignored by Git. Do not serve the project with a generic static server: it cannot authenticate requests and may expose private files.

## Accounts and ownership

- The first local **Staff sign in** opens one-time setup for the first Mo account. After that, `/api/setup` refuses new setup requests.
- Mo creates volunteer accounts tied to existing fictional roster identities. Public registration cannot grant staff access. Account roles come from the server database, not from request bodies.
- Passwords use salted scrypt hashes with N=131072, r=8, p=1. Passwords are not stored as text or returned by the API.
- Staff sessions use random opaque tokens in HttpOnly, SameSite=Strict cookies. Sessions expire after eight hours and are invalidated on sign-out or server restart.
- Guest report ownership uses an HMAC-signed, HttpOnly cookie. Guests can view only their own reports and explicitly confirm their own resolution. They cannot acknowledge/escalate reports or view Mo's queue.
- State-changing API calls require a session-bound CSRF token and same-origin requests. Login attempts are limited, and the server caps concurrent password-hashing work.
- Only allowlisted browser assets are served. Account data, server code, environment files and Git files are not web assets.

The local first-run setup is intended for the laptop operator. This app has not been publicly deployed. Before a later deployment, configure HTTPS, secure cookies, permitted hosts, controlled administrator provisioning and a persistent data volume. Password reset and account recovery are not implemented; record your credentials privately.

The password-storage implementation follows [Node's crypto API](https://nodejs.org/api/crypto.html) and [OWASP's scrypt guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt).

## Deploying online

The server runs on any host that runs one long-running Node.js process (for example Render or Railway). Serverless hosts (Vercel, Netlify functions) will not work: they lose the in-memory sessions and the JSON file between requests.

- **Start command:** `npm start` (no build step, no install needed). Node 20 or newer.
- **Environment variables** (set in the host's dashboard, never in Git; names in `.env.example`):
  - `PUBLIC_ORIGIN`: the site's public address, exactly, e.g. `https://riverside-xyz.onrender.com`. This switches on deployed mode.
  - `MO_USERNAME`, `MO_PASSWORD`: Mo's account (password 12–128 characters). Created or updated on every start.
  - `PORT`: usually set by the host automatically.
- In deployed mode the server listens on all interfaces, accepts only the `PUBLIC_ORIGIN` host (plus localhost), marks cookies `Secure`, and **disables browser first-run setup**, so a visitor cannot claim the Mo account.
- **Storage caveat:** `store.json` lives on the host's disk. On hosts or plans without a persistent disk, it is wiped on every restart or redeploy, and Mo's volunteer accounts must be recreated. Mo's account is recreated automatically from the environment variables.
- Known limits: the login rate limit counts by connection address, which behind a host's proxy may be shared by all visitors; each password check uses about 128 MB of memory (at most two at once).

## Storage and integration

**Live updates.** Browsers connected to `GET /api/events` are told immediately when reports or incidents change, then re-fetch their own permitted state. The interface's 6-second polling remains as a fallback. Because the server only accepts `127.0.0.1`/`localhost`, live sharing currently works between browser windows on the same computer, not between phones.

**Demo reset.** Signed in as Mo, run `RiversideAPI.resetDemo()` in the browser console (or `POST /api/reset`) to clear all reports and incidents before re-recording a demo. Accounts are kept. To wipe everything including accounts, stop the server and delete the `.riverside/` folder.

One server process owns the JSON store, written atomically with private file permissions. Reports and accounts survive restarts; staff sessions are in memory. This is a prototype store, not a multi-process database.

Person 2 owns this entry point, account handling, the browser API adapter and workflow validation. Person 3 can replace the analysis stub with provider code running on this server. API keys belong in server environment variables, never browser code. Add required variable names without values to `.env.example` when needed.
