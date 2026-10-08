# Maps fresh-load failure — 8 October 2026

**Live map loading is blocked by Google's daily Demo Key quota.** At 02:39 UTC (1:39pm Melbourne), a fresh browser document with a unique Google loader callback reproduced the user's failure. Google logged: `Maps Demo Key limit reached: Your daily quota for Maps JavaScript 2D has been met.` No more live map reload tests were made after identifying the exhausted allowance.

Earlier browser checks showed an already loaded/cached Google map. They did not establish that a new uncached request would succeed. The original browser tool exposes no cache-clearing command; the diagnostic used a new document and an uncached Google script URL, rather than claiming all cookies/cache had been deleted. Native Safari/Chrome inspection was unavailable because computer-use permissions were not granted. The user reports the same failure in both browsers at the current tunnel origin.

Google's [Demo Key documentation](https://developers.google.com/maps/documentation/javascript/demo-key) says daily-limit usage pauses until the following day. The exact reset time and account quota counter were not independently verified. Billing was not enabled, keys were not rotated, no quota restriction was bypassed, and no AI inference was used.

Recovery improvements:

- Explicit Retry map rechecks configuration and retries without reloading the report form.
- Network failures/timeouts and Google authentication/allowance rejection have different messages. Retry cannot increase Google's allowance.
- Independent callback names prevent late failures/callbacks from older attempts hiding a recovered map. A fresh callback also avoids relying on a previously cached loader response.
- Loader errors retain their explanation rather than being overwritten by a generic map-data error. Retry is disabled during loading and re-enabled after a failure.

**185/185 simulated tests passed** before the final callback-name/message adjustment; the complete 11-test map-client suite passed again after those adjustments. Includes script failure, timeout/retry, unchanged report text, old-attempt isolation, Google auth denial and pin behaviour. Actual successful map recovery remains unverified and blocked by the provider allowance.

Next decision: keep the no-billing demo setup and wait for reset, or supply an explicitly approved existing billing-enabled key through private local configuration. No new cost is authorised by this diagnostic.
