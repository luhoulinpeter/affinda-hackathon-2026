# Live AI verification — 7 October 2026

## Additional map MVP checks — late evening

After advance notice, one additional call per provider checked the new sensitivity and ranking features through the actual adapters and strict response validation:

| Provider | Fictional input | Actual result |
|---|---|---|
| Jev `jev-latest` | An attendee asks to discuss harassment privately and restrict sharing | `category: other`, `urgency: unclear`, `sensitivity: sensitive`; this holds assignment for Mo |
| OpenRouter `nvidia/nemotron-3-super-120b-a12b:free` | Two eligible candidates: nearby/same-zone and far/other-zone | Ranked the nearby/same-zone candidate first; returned both supplied IDs exactly once |

These were **one Jev and one free OpenRouter request**, with no retries or paid fallback. Jev dollar cost and token counts were not collected; request latency was not measured correctly and is not reported. This is representative integration evidence, not a broad quality evaluation.

The announced test limit was persisted separately in ignored `.riverside/map-ai-check-usage.json`, at one call per provider, with the existing spending-control evidence and original expiry. Both test calls are spent. The check did not open or write the active app's store, reset/expand its interactive ledger, renew approval dates, buy credits or enable recharge. Preserve the spent test ledger on rerun. The earlier interactive session numbers below describe their original handoff, not a new balance reading.

Recorded requests across this document: **4 Jev and 3 OpenRouter**. Other user/chat activity is not included in that count.

The user authorised two OpenRouter checks, small Jev checks and bounded interactive use of the local app. This is a record of actual responses, separate from simulated tests. No large run, balance-exhaustion test, new purchase, recharge or paid OpenRouter route was used.

## Checks performed through the real app

| Check | Actual calls | Observed result |
|---|---|---|
| Submit one fictional spill report in Zone B | 1 Jev, 1 OpenRouter | Saved as I-1/R-1 immediately; both background results completed. Jev returned category `other`, urgency `routine`. OpenRouter returned a short summary. |
| Ask the current status of I-1 | 1 Jev, 1 OpenRouter | Jev permitted informational answering; answer described the open/review state and cited I-1 and R-1. |
| Describe fictional crowd pressure at a barrier | 1 Jev | Produced an editable **Not submitted yet** draft. No OpenRouter call and no new report; storage still contained one report/incident. |

Total: **3 Jev and 2 OpenRouter inference requests**. Keys were never displayed or committed. OpenRouter used `nvidia/nemotron-3-super-120b-a12b:free` with zero-price routing and no fallback. Jev used `jev-latest`. Actual token counts and Jev dollar charges were not collected; do not invent an exact test cost.

## Quality observations and limits

The connections and response parsing worked. Jev classified the small spill as `other` instead of the expected hazard; category accuracy needs further evaluation. The summary stated the spill occurred, while the underlying record is an unverified report: humans should check the original, and future prompt/evaluation work should strengthen attribution. The sourced status answer matched the supplied record. These examples do not establish safety accuracy, injection immunity or general reliability. No physical-phone or live staff-role evaluation was performed in this session.

## Billing and interactive handoff

Read-only checks confirmed the OpenRouter key is valid with 1,000 free requests/day (1,000 remaining before these tests) and a $3 per-key spending cap. The app additionally blocks paid model IDs and sends zero maximum prompt/completion/request prices. Jev console showed $5 available and auto-recharge off. A provider-enforced Jev hard stop remains unverified; the explicit existing-credit authorisation is recorded separately, not fabricated as hard-stop verification.

The local app at `http://127.0.0.1:8765/` is left enabled for the user, with a persisted allowance of 20 requests per provider, including the checks above. At handoff: **17 Jev and 18 OpenRouter calls remain**. The session expires at `2026-10-07T15:51:28.293Z`; exhaustion or expiry disables calls. Requests may finish in the background; the UI refreshes the remaining count. No automatic renewal, retry, recharge or new credit purchase is configured. Small automatic checks are now authorised; give advance notice for large runs and ask before increasing agreed allowances/substantial costs, per AGENTS.md.

The fictional guide remains unapproved. Public site facts are therefore unavailable; questions about your permitted incident records can be answered. Use fictional reports only. Site-guide approval is still a team action, not implied by enabling AI.

Automated suite after the session-control changes: **33/33 passed**, with injected simulated providers. See [AI setup](AI-SETUP.md) for configuration and approval records. The live screenshot is a local temporary artifact, not a deployment. Runtime keys, verification and database remain ignored by Git.
