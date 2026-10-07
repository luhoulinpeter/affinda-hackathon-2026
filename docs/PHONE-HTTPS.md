# Temporary HTTPS phone access

The user authorised a temporary HTTPS link on 8 October 2026. Cloudflare forwards the public link to one Riverside server on this Mac. It uses the existing accounts, reports, provider approval and usage ledger. The tunnel client lives in ignored `.riverside/tools/`, rather than a system-wide installation. Release 2026.10.0 was downloaded from Cloudflare's official GitHub release; its archive SHA-256 matched the release API digest.

## Using the running link

The current URL is in the chat and private `.riverside/phone-access.json`. Open it in Safari or Chrome on your phone; use the same HTTPS URL on the Mac. Attendees do not need an account. Staff use their existing usernames/passwords. Location sharing asks for browser permission on the phone. Physical-device GPS has not yet been verified.

Keep the Mac awake, lid open and online. Both the app and tunnel processes must remain running. The hostname changes when the tunnel is recreated; stopping the tunnel removes remote access. Anyone with the URL can reach the attendee view, while staff data still requires the appropriate account. The link is temporary, not a hosted service with guaranteed uptime. [Official Quick Tunnel documentation](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

The phone launcher binds only to `127.0.0.1`, accepts only its configured public Host, enforces the HTTPS origin for browser mutations, marks cookies Secure/HttpOnly, and disables browser Mo setup. It requires an existing Mo account and does not replace its password. While this launcher runs, the old `http://127.0.0.1:8765/` browser address is rejected; use the HTTPS URL instead. Guest cookies/report histories belong to the particular browser and site address; a phone or new hostname does not inherit an attendee's laptop cookie. Saved reports remain visible to Mo.

Cloudflare Quick Tunnels do not support server-sent event streams. The phone launcher advertises polling so the browser uses its existing six-second refresh without opening an unsupported stream. This is the foreground refresh interval, not a measured physical-phone latency guarantee. Normal local/deployed servers keep their existing instant-event behavior.

## Restarting later

Do not start a second app process against the same store. Stop the existing app and tunnel first. In one terminal from the project folder:

```sh
.riverside/tools/cloudflared tunnel --no-autoupdate --url http://127.0.0.1:8765 --protocol http2
```

Copy the actual printed HTTPS origin. In a second terminal, replace the placeholder below with that origin, without adding a path:

```sh
RIVERSIDE_PHONE_ORIGIN='<printed HTTPS origin>' node --env-file=.env server/phone-demo.cjs
```

Leave both terminals running. Existing staff sign in again after a server restart. Google Maps was verified on the initial generated hostname; if a future hostname is rejected by Google's website restrictions, add only that exact origin to the Maps key's allowed websites in Google Cloud. Do not remove the key's API restrictions.

To stop phone access, stop the tunnel and app with Ctrl-C in their terminals. To return to local-only use:

```sh
node --env-file=.env server/index.cjs
```

## Verification — 8 October 2026

- **149/149 simulated tests passed**: [saved output](checks/https-phone-tests.txt). Includes ongoing AI approval, existing accounts, public-host/origin validation, secure cookies, disabled first-run setup, private-file blocking, and polling selection.
- Actual generated HTTPS origin returned HTTP 200 for the page, session, public state and map-data endpoints. Anonymous state contained zero other people's incidents/reports; map data exposed three fictional stations. Cross-origin request returned 403. `.env`, the store, server source and Git configuration returned 404.
- Browser loaded the actual Google basemap and three station pins through HTTPS; existing-account sign-in form appeared. [Browser screenshot](checks/https-phone-link.png).
- No live AI inference, report creation, account replacement, credit purchase or billing change was needed. Existing data is preserved.
- Still unverified: physical phone GPS, phone connectivity over university Wi-Fi/mobile data, and staff login from the actual phone. The user completes those checks with their own account and location permission.
