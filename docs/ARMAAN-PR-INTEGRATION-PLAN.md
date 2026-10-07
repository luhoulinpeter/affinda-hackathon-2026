# Armaan PR #1: review and integration plan

> Completed 7 October 2026: PR #1 was merged into `main` as `0d869b1`, including the existing Jev/Luna milestone. The reset ID reuse, test command, late analysis/Q&A and guest-session startup issues were fixed. All 28 automated checks passed with simulated providers; browser checks covered separate public/staff sessions, queue updates, report ownership after refresh, Q&A, safety drafts and sign-out clearing. The local server was restarted on the merged version. Live AI calls remain disabled; hosting and physical phones remain unverified. The review and plan below are retained as a historical record of the pre-merge state.

Reviewed 7 October 2026. This is a plan, not a merge or approval. No application files were changed during this review.

- PR: https://github.com/luhoulinpeter/affinda-hackathon-2026/pull/1
- Title: **Live updates, demo reset and deployed mode for the server**.
- Reviewed head: `7df19335ebbd73bcd39cbb46d767c7ad5ee41390`.
- Reviewed committed main: `cb4ede3ea3a0eacc4803e1a52e3bf5c15fdca5d3`.
- GitHub showed 10 commits, 15 changed files, 582 additions, 17 deletions, no conflicts with committed main and zero automated checks. The active AI changes were uncommitted and therefore absent from GitHub's conflict calculation.

## What Armaan changed

| Change | Implementation | How it fits |
|---|---|---|
| Live updates | `GET /api/events` uses Server-Sent Events, a browser connection for receiving updates. Sends only an empty change signal; the browser fetches its own permission-filtered state. Includes heartbeat, reconnection and existing six-second polling fallback. | Mo and volunteers can see new reports and changes sooner. The same notifications can show background Jev/Luna results as each finishes. |
| Demo reset | Mo-only, CSRF-protected `POST /api/reset`, domain `reset()` and browser `RiversideAPI.resetDemo()`. Clears reports/incidents while keeping accounts. No reset button. | Supports repeating a fictional demo. Requires the ID fix below before integration. |
| Deployment mode | `PUBLIC_ORIGIN`, public network binding, host/origin checks, Secure cookies for HTTPS, disabled browser first-account setup, operator-provided Mo credentials on startup. | Prepares the existing Node app for hosting without changing frameworks or adding a database. This is deployment support; no actual deployment was verified. |
| Run configuration | Dependency-free `package.json` with start/test scripts, Node >=20, and deployment variable names in `.env.example`. | Keeps the existing stack and provides a standard start command. The test script needs the compatibility fix below. |
| Tests and documentation | Two additional server tests, server/API docs, Person 2 task list, stack decision and form-submission status. Also includes older proposal/official-track documents from branch history. | Useful server handoff material, but reconcile stale statements with the current project and AI implementation. |

This PR does not implement volunteer assignment, eligibility/coverage rules, maps, voice, Q&A or real model calls. Its analysis adapter remains the original stub. The older revised-MVP document does not mean grouping/Split/Merge have been accepted; the current project explicitly sets them aside.

## Separate AI work to preserve

The active chat **Review Armaan branch roles** is implementing the user's approved First Jev + Luna integration in the same checkout. It includes background independent provider jobs, validated suggestions, role-scoped Q&A for all three views, editable safety-report handoffs, Mo reporting, conversation invalidation on identity changes, and disabled live calls pending verified credit controls. The fictional guide needs team approval before use.

Do not switch branches, stash, reset, stage all files, commit its unfinished changes or restart its running app during this review. Do not run the demo reset against the shared app. This chat has not sent messages to the other chat or posted a GitHub review.

Snapshot comparisons found textual conflicts in all four shared files below. These are temporary-copy comparisons; the active chat continues changing files, so repeat against its completed commit.

| Shared file | Required combined result |
|---|---|
| `server/index.cjs` | Combine deployment options with AI options in `createApp`. Keep provider construction, credit reservations and AI-backed workflow; attach the event subscription to that single workflow. Keep Q&A routing, AI session metadata, guide approval status, Mo report submission and `whenAIIdle`. Add deployment setup lockout, origin checks, Mo provisioning, reset route and stream cleanup without restoring stub initialization or the old Mo-report prohibition. |
| `src/js/domain/incidents.js` | Keep independent Jev/Luna jobs, validation, urgency protection and `whenIdle`; add safe reset alongside them. Old asynchronous results must not affect new incidents after reset. Never reset provider usage allowances. |
| `src/js/services/api.js` | Keep Q&A methods and identity-change safeguards; add EventSource and reset methods. Test that event refreshes during login/logout cannot expose an old role's state or revive old conversations. |
| `.env.example` | Combine deployment and provider variable names into one file. Keep provider enable flags false by default. No credentials or approved-credit evidence in Git. |

`tests/server.test.cjs` and project/API docs may also overlap by the time AI work finishes. Add both sets of tests and rewrite final-state documentation instead of choosing one side wholesale. Armaan left `index.html`, CSS, UI modules and the analysis adapter unchanged; preserve the AI chat's changes there.

## Issues to address before merging

1. **Reset reuses incident IDs.** Reproduced on the PR: create old `I-1`, reset, create a different `I-1`, then resolve using the old ID: the new incident becomes resolved. A stale Mo screen can therefore act on unrelated work. Use IDs that are not reused, including across reset/restart; persist the counter or use unique IDs. Add a regression test proving the old reference cannot change the new incident. Update the existing reset test that currently expects reuse.
2. **Advertised test command fails on the local runtime.** Node v25.7.0 rejects `node --test tests/` with `MODULE_NOT_FOUND`. `node --test tests/*.test.cjs` passes all 10 tests. Update the npm test script and run instructions to the working command, or constrain/document a separately verified runtime.
3. **Documentation carries superseded assumptions.** Person 2's task list mentions grouping in its summary despite later setting it aside, describes localhost-only hosting despite deployed mode, and still treats AI contracts as undecided. PROJECT.md's next step still asks whether to migrate although the stack decision is recorded. Refresh against the completed AI integration. Treat form submission as Armaan's reported confirmation, not something this review independently verified.
4. **Deployment is not yet demonstrated.** Before public hosting, verify an HTTPS public origin, the proxy's streaming behaviour, persistent storage, operator account provisioning and phone access. Reject invalid/non-HTTPS deployment origins rather than silently accepting an insecure public configuration. Keep reset clearly limited to demo use. This plan does not authorize public deployment or paid services.

## Merge sequence

1. Let the AI chat finish its implementation and checks, then checkpoint its work on the agreed branch. Record its exact commit and verification limits. Leave live providers disabled until the already-required credit verification is complete.
2. Refresh main and PR refs. Create a separate integration worktree/checkout and a branch such as `codex/armaan-pr-integration` from the finished AI baseline. Do not perform integration inside the active shared checkout.
3. Merge the reviewed Armaan branch into that integration branch. Resolve shared files according to the table. Retain useful older documentation only as clearly historical material; do not reinstate its discarded product scope.
4. Fix ID reuse and the test script; reconcile docs and `.env.example`. Check reset behaviour with in-flight AI work, pending Q&A, stale browser actions and persistent usage accounting.
5. Run the combined test suite with simulated providers. Test both providers failing independently, urgent flags, explicit human resolution, Mo reporting, account permissions, Q&A source isolation, identity changes, reset permissions, late results after reset, deployment host/origin/cookie/setup rules and restart persistence.
6. Check two independent browser sessions: public submission appears for Mo; another public reporter cannot see it; provider completion updates the right screens; reconnect/polling recovers; sign-out clears Q&A. Use a temporary fictional store. Check desktop and phone-sized layouts. Report live model calls, physical-phone access and actual hosting separately.
7. Review the final diff and evidence, then merge the tested combined result into main as a separate authorized implementation step. If AI work first lands on main, update this PR with that main and rerun checks before merging it. Do not click GitHub's current merge button while its conflict status excludes the unfinished AI changes.

## Evidence and limits

- Fetched PR head into a review-only Git ref; exported it into a temporary directory. The shared application's files and private `.riverside/` data were not used by tests.
- **10/10 PR tests passed** using `node --test tests/*.test.cjs` with temporary localhost test servers. These cover existing domain/account behaviour and the added event/reset/deployment HTTP cases.
- Reproduced stale-action ID reuse separately; it is not covered by the passing suite.
- Temporary three-way comparisons confirmed conflicts in server, domain, browser API and environment example against the unfinished AI snapshot.
- Combined code was not built or tested. Two-browser live behaviour, real deployment, physical phones and real provider calls were not verified in this review.
- This review used Codex; keep it in the team's AI-tool disclosure record.
