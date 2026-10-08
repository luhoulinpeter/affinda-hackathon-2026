# Connection errors — 8 October 2026

Reproduced the visible `Unexpected token '<'` message in the live attendee page. The Cloudflare tunnel log records lost/re-established edge connections; the API was responding normally again when checked. An HTML tunnel error is consistent with the JSON parsing failure, though the original failed response was not captured.

- API response parsing now gives a readable connection/current-link message for non-JSON responses, including HTTP status when available. Valid server permission errors retain their explanation. No automatic submission retry was added.
- Updated Google Maps pins to use `PinElement` directly and `addEventListener('gmp-click', ...)`, following [Google's marker reference](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers). These remove the two observed deprecation warnings.
- **183/183 simulated tests passed**, including HTML-error recovery, no submission replay, retained report state/text, permission errors, pin clicks and zone selection. Full run: `node --test tests/*.test.cjs`.
- Live HTTPS page and map reloaded with three zones and three first-aid pins. A fresh browser tab reported no errors or warnings after loading. The existing testing URL remains in ignored `.riverside/phone-access.json`.
- No live AI inference, report submission, account change, API allowance change or app restart was needed. Cloudflare interruptions and physical-phone GPS remain outside what these checks establish. Native automation could not click Google's closed-shadow-root markers; marker interactions were checked in simulated tests, not claimed as live click verification.
