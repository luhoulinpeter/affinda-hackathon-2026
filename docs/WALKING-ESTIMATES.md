# Google walking estimates and iPhone location recovery

Requested 8 October 2026. Implementation is present; **live Google routing is disabled and unverified**. The saved browser Maps key does not supply a server Routes key. No Google routing or AI calls were made for implementation/testing.

## Behavior

Accepted GPS assignments show a fixed starting Google walking estimate below the map in all three role views. A Google duration of 120 seconds or less displays **Up to 2 minutes**; longer values round up to whole minutes, for example 121 seconds → About 3 minutes. Explicit arrival replaces the estimate; resolution removes it. The dotted curve remains decorative rather than a walking route. No arrival/resolution is inferred from ETA or distance.

The server sends only the responder starting coordinates saved at acceptance and the assistance destination to Google's `computeRoutes` endpoint with `travelMode: WALK`, requesting duration/warnings. Names, report text, AI fields and credentials are not sent. Public views receive a formatted estimate, provider attribution and calculation time, never moving responder coordinates or the routing key. No duration is invented on failure, absent starting/destination coordinates or exhausted allowance. A saved starting estimate remains readable if current GPS later goes stale; it is clearly labelled as a starting estimate, never live remaining time. Lifecycle, privacy and staff session are checked again after a routing response.

Viewers share one in-memory starting result for the accepted assignment. Moving GPS, elapsed time, new viewers and page reloads never recalculate it. The first failure is retained too, so polling cannot spend credits retrying it. A different accepted offer/volunteer/destination gets its own estimate; arrival replaces it and resolution removes it. Fictional demo journeys use their frozen start, not their moving point, and are kept separate from measured assignments. Concurrent viewers share one in-flight request. Inactive assignment caches are removed without evicting active estimates.

The result is not persisted: an app-server restart can request it again from the same frozen starting point. Only the cumulative attempt count is saved under `routesUsage` in the private app store; attempts/failures survive restarts. Never silently reset or raise that counter/limit. This starting-only policy, requested later on 8 October, supersedes the previous one-minute/five-minute live refresh policy.

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

## Starting-only update — 8 October

**171/171 isolated tests passed**, including frozen origin despite movement before the first map view, unchanged results after elapsed hours/stale GPS, shared concurrency, new-assignment separation, fictional frozen starts, error reuse, lifecycle/privacy rechecks and all prior zone/role regressions. [Output](checks/starting-eta-tests.txt). Actual isolated browser: attendee requested assistance → Priya accepted → attendee/Priya/Mo showed the fixed starting label; attendee reload retained it. Store measured **one simulated routing attempt** across those viewers/reload. [Screenshot](checks/starting-eta-demo.png) uses simulated 90-second duration, not live Google routing. No live AI/Routes calls; actual routing remains disabled pending setup.

Google public pay-as-you-go pricing checked 8 October: Dynamic Maps 10,000 monthly free loads then US$7/1,000 at the first paid tier; Compute Routes Essentials 10,000 monthly free requests then US$5/1,000. Free usage is not a hard spending cap. Published load quotas: 30,000/minute/project and 300/minute/IP; Compute Routes 3,000 requests/minute. Actual project settings and remaining billing-account allowance have not been inspected. [Official pricing](https://developers.google.com/maps/billing-and-pricing/pricing), [Maps quotas](https://developers.google.com/maps/documentation/javascript/usage-and-billing), [Routes quotas and controls](https://developers.google.com/maps/documentation/routes/usage-and-billing). Our map creates one map instance per page and updates markers; pin updates do not reload the map.

Applied through the existing phone launcher and verified HTTP 200 for session and updated map script on the same active HTTPS origin. Before/after hashes matched for saved accounts, original reports, incident IDs, zone configuration and API ledgers; live routing attempts remain zero. Staff sign in/Go available again after the restart.
