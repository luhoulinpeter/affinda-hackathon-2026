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

## Storage and integration

One server process owns the JSON store, written atomically with private file permissions. Reports and accounts survive restarts; staff sessions are in memory. This is a prototype store, not a multi-process database.

Person 2 owns this entry point, account handling, the browser API adapter and workflow validation. Person 3 owns the implemented provider adapters under `server/ai/`; calls remain disabled until verified credit-only controls are configured. API keys belong in server environment variables, never browser code. Add required variable names without values to `.env.example` when needed.

## AI configuration

See [AI-SETUP.md](../docs/AI-SETUP.md). The server does not automatically load `.env`; use `node --env-file=.env server/index.cjs` with Node 20.6+ if using a local environment file. The API never returns keys. Provider flags alone cannot enable calls: current credit-only verification is required, and attempted calls consume a persisted allowance. Guide approval and provider enablement are separate. No real requests were made during implementation.
