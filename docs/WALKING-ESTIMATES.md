# Google walking estimates and iPhone location recovery

Requested 8 October 2026. Implementation is present; **live Google routing is disabled and unverified**. The saved browser Maps key does not supply a server Routes key. No Google routing or AI calls were made for implementation/testing.

## Behavior

Accepted GPS assignments show a Google walking estimate below the map in all three role views. A Google duration of 120 seconds or less displays **Up to 2 minutes**; longer values round up to whole minutes, for example 121 seconds → About 3 minutes. Explicit arrival replaces the estimate; resolution removes it. The dotted curve remains decorative rather than a walking route. No arrival/resolution is inferred from ETA or distance.

The server sends only the current responder coordinates and assistance destination to Google's `computeRoutes` endpoint with `travelMode: WALK`, requesting duration/warnings. Names, report text, AI fields and credentials are not sent. Public views receive a formatted estimate, provider attribution and calculation time, never moving responder coordinates or the routing key. No duration is invented on failure, absent GPS, stale presence or exhausted allowance. Lifecycle, privacy and staff session are checked again after a routing response.

Viewers share a short in-memory result for the same assignment. Requests are limited to once per minute per assignment; movement of 50 metres can refresh after that interval, and otherwise an estimate refreshes after five minutes. The time of calculation is shown as it ages. Concurrent viewers share one in-flight request. Errors are held for a minute to avoid repeated calls. Results are never persisted; only a cumulative attempt count is saved under `routesUsage` in the private app store. Attempts, including failures, survive restarts. Never silently reset or raise that counter/limit.

## Live setup pending user approval

The user's standing Jev/free OpenRouter approval does not authorise a new Google routing bill. Proposed allowance: **100 total routing attempts** across the app, including checks. Google's listed Compute Routes Essentials base tier is US$5 per 1,000 beyond 10,000 free monthly events; 100 non-free requests would be US$0.50 before tax. Account usage/free allowance is unverified. Do not enable until the user answers the pending cost question. [Pricing](https://developers.google.com/maps/billing-and-pricing/pricing), [billing and quotas](https://developers.google.com/maps/documentation/routes/usage-and-billing).

After approval, the account owner enables Routes API in their Google Cloud project and supplies a separate server-only key restricted to Routes API. Keep the browser map key separately restricted for browser use. Save the server key only in ignored `.env`, never in chat/Git:

```dotenv
GOOGLE_ROUTES_API_KEY=<server-only key>
RIVERSIDE_GOOGLE_ROUTES_ENABLED=true
RIVERSIDE_GOOGLE_ROUTES_MAX_CALLS=100
```

Default is disabled/zero calls. Apply changes by restarting the existing phone launcher, never by starting a second process on the same store. Google Cloud daily quotas provide an additional account-side control. The local limit covers this app only. Live activation needs a bounded fictional route check; record attempts against the same allowance. Review Google account/API configuration if Google rejects the request. [Request API](https://developers.google.com/maps/documentation/routes/compute_route_directions), [API policies](https://developers.google.com/maps/documentation/routes/policies).

## iPhone recovery

The app calls geolocation directly from Send or Go available. Safari may omit a popup when a permission was already granted or denied. Missing popup alone does not identify the cause. The user's exact phone error and a physical-device retry remain pending.

1. In Safari on the current HTTPS address, open the page menu → Website Settings → Location → Ask or Allow.
2. In iPhone Settings → Privacy & Security → Location Services → Safari Websites, allow access while using Safari and enable Precise Location.
3. Return to the page and tap the button again. For a report, first enter its required text. Manual-zone report-only submission needs no GPS; volunteer attendance/sharing still needs a valid accurate fix.

The report and volunteer sections contain these instructions. Denial preserves text and enables retry. A 30-second independent guard handles a browser that never invokes its GPS callbacks; it sends no report/presence and ignores late results. Existing 15-second acquisition timeout and fresh/accurate fix validation remain. The server explicitly sets `Permissions-Policy: geolocation=(self)`; this cannot override Safari/iOS denial. [Apple device settings](https://support.apple.com/guide/iphone/control-the-location-information-you-share-iph3dd5f9be/ios), [Apple website settings](https://support.apple.com/guide/iphone/browse-the-web-privately-iphb01fc3c85/ios).

## Measured checks

**165/165 tests passed** with isolated stores and simulated Google/AI/GPS. [Output](checks/safari-walking-tests.txt). Includes rounding, request mode/field mask, secrets/coordinate privacy, all role projections, shared request/cache limits, stale/missing GPS, routing failure/no-route/malformed duration, persisted attempt reservation, resolution/sign-out while routing is pending, silent GPS and late callbacks.

Actual browser sandbox verified denied GPS → preserved text and recovery guidance → successful manual-zone report; a separate successful GPS request → Priya's acceptance → Up to 2 minutes in attendee/Priya/Mo → explicit arrival replacing the ETA. [Location recovery](checks/safari-location-recovery.png), [walking ETA screenshot](checks/walking-estimate-demo.png). The screenshot's 90-second route response was simulated, not a live Google estimate. Real Google basemap loaded. Physical iPhone Safari GPS, live Routes API configuration, actual walking duration and billing remain unverified.

The original Quick Tunnel disconnected during verification (HTTP 530; network/DNS errors in its log). Recovered with a new temporary hostname and updated the phone launcher's allowed origin; page/session now return HTTP 200 with the explicit geolocation policy. Actual HTTPS browser opened the new link and expanded the iPhone help. [Live help screenshot](checks/iphone-help-live.png). Current URL is in ignored `.riverside/phone-access.json`. Users open that new URL and sign in/Go available again. Hash comparisons confirmed saved users, reports and AI usage unchanged; 2 accounts, 12 reports and 12 incident IDs retained. Routine assistance restart events are expected. Live routing attempts remain zero.
