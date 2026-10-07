# Independent sign-in per tab

Implemented 7 October 2026. Open the same app in three tabs, sign in as Mo in one and a volunteer in another, and leave the third as an event-goer. Signing in or out affects only that tab. Refresh retains its sign-in while the session is valid. New tabs start as event-goers. Existing accounts and incident records are unchanged; the migration/server restart requires signing in again.

## How it works

- `src/js/services/tab-session.js` stores a random tab selector in `sessionStorage`. It uses `BroadcastChannel` to detect copied storage from a duplicated/opener tab and choose a fresh selector. A late response from a sleeping sibling replaces the copied selector and reloads that tab. Restoring a cached document rechecks ownership through a reload. Unsupported cross-tab messaging or blocked storage produces a visible startup error.
- API requests include `X-Riverside-Tab`. The server selects `riverside_session_<tab-id>`, an HttpOnly, SameSite=Strict cookie (also Secure on deployed HTTPS). Server-side credentials are bound to both the tab selector and the signed browser guest identity. The selector alone cannot authenticate anyone. Passwords, staff-session credentials and roles are not stored in JavaScript-accessible storage or URL parameters.
- Guest CSRF tokens are tab-bound; staff CSRF tokens remain session-specific. Server-side permissions, origin validation, password hashing and eight-hour session expiry remain enforced. A missing/invalid selector returns HTTP 400 with a reload instruction. The old shared `riverside_session` cookie is ignored.
- The live-update stream uses `/api/events?tab=<selector>` because native EventSource cannot supply a custom header. It broadcasts only an empty change signal. Each tab then fetches its own permitted records. No authentication credential enters the stream URL.
- Sign-in/sign-out clears only that page's chat, pending replies, private rendered state and local GPS watcher. Account records, incidents and role-filtered live updates are shared as before.

This separates tab sign-ins for convenient use/testing; tabs on the same website are not separate security origins. Public/event-goer report history still belongs to the signed browser guest cookie and is shared between guest tabs in that browser profile. Keeping that cookie preserves existing report ownership. Separating guest histories is outside this change.

## Volunteer GPS ownership

Only one session can own active location sharing for a volunteer account. Another tab/device signed into that same account receives HTTP 409 when trying to start or pause its fresh tracking. It must pause in the owning tab first, or wait until the position/session expires. Signing out or replacing the account in a non-owning tab does not pause the owner's presence. Mo's explicit withdrawal/retry/reset and human resolution retain their existing behaviour. Hidden-page pausing and 60-second freshness rules still apply; changing tabs does not add background GPS support.

## Verification

59 simulated automated tests pass, including shared-cookie Mo/volunteer/guest sessions, scoped logout, tab/browser credential binding, CSRF rejection, expiry, independent guest/staff records, same-account GPS ownership, duplicated tabs, late sibling responses and refresh persistence. Existing reporting, AI-budget, assistance and server-permission checks still pass.

An isolated browser fixture with disposable accounts and AI disabled verified three identities concurrently in one browser, a copied/opener tab starting as a guest, a report appearing live for Mo but not an unrelated volunteer, volunteer sign-in surviving refresh, and Mo sign-out leaving the volunteer signed in. No live AI calls or real GPS were needed. The fixture uses a separate hostname to avoid cookie overlap with the real localhost app. The temporary overlap found during testing was corrected by restoring the original guest-history cookie; saved user records were not changed.
