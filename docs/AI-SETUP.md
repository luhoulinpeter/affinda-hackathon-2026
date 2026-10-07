# Jev and OpenRouter setup

Updated 8 October 2026. Jev handles classification and chat safety screening; OpenRouter replaces the former direct OpenAI/Luna connection for summaries and grounded Q&A. Basic live calls have been checked: three Jev requests and two OpenRouter requests; see [live check record](AI-LIVE-CHECKS.md). See the live-session status in PROJECT.md; flags and records are private. Both provider keys are present privately. The fictional guide is unapproved.

## Latest live-use authorisation — 8 October 2026

The user explicitly requested **permanent approval** and reports setting limits at the APIs. The local app now uses ongoing approval, without an eight-hour expiry or local twenty-call ceiling, until revoked. Provider limits remain user-reported; no provider-enforced hard stop was independently verified by this change. Existing purchased Jev credits and free-only OpenRouter remain the approved services. Every attempted request still increments the original persisted ledger before transport, including failures; IDs and historical usage are not reset.

Small automatic checks remain capped at five calls per provider per work session by default. The earlier morning window already spent four Jev and three OpenRouter automatic calls; do not reset that test ledger. No live calls were needed to implement ongoing approval. Notify before larger runs with provider, purpose, maximum calls and cost estimate when known; ask before substantial/new costs. Do not purchase credits, enable recharge, use paid OpenRouter models or deliberately drain balances. Routine checks use simulations.

The ignored `.riverside/ai-credit-verification.json` keeps each provider's original ID and adds:

```json
{
  "approvalMode": "ongoing",
  "approvedAt": "<actual timestamp of the explicit user approval>",
  "providerLimitsReportedByUser": true,
  "expiresAt": null,
  "maxCalls": null
}
```

Jev also requires `existingCreditUseApproved:true`. OpenRouter requires `freeOnlyConfirmed:true` and `liveTestApproved:true`; its model ID and zero-price routing remain enforced. Old verification evidence and previous bounds are retained as historical metadata. This is an operator's record of actual consent, not permission granted by the sample configuration.

To revoke ongoing approval, set `revoked:true` on the relevant provider record, or disable its environment flag, then restart. Restart invalidates staff sessions and preserves reports and usage. Missing/invalid consent, disabled flags, absent keys and paid OpenRouter models still block calls. Status reports `remainingCalls:null` for ongoing approval: the app does not know the remaining provider balance.

The bounded record examples below remain supported for other deployments or deliberately limited sessions; they are historical alternatives to the ongoing approval currently used here.

## Private configuration

Keep credentials only in the ignored `.env` file or server environment. Never paste keys in chat, commit them, return them to the browser or serve the repository through a generic static server. The app does not load `.env` automatically: with Node 20.6+ start using `node --env-file=.env server/index.cjs`. Restart after changing configuration; staff sessions require sign-in again.

```dotenv
TYPESAFE_API_KEY=<private TypeSafe key>
OPENROUTER_API_KEY=<private OpenRouter key>
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
RIVERSIDE_JEV_ENABLED=false
RIVERSIDE_OPENROUTER_ENABLED=false
```

`OPENAI_API_KEY` and `RIVERSIDE_LUNA_ENABLED` no longer enable any connection. Existing private values may be removed by their owner when no longer needed. No ChatGPT subscription connection is implemented or required for OpenRouter.

## OpenRouter free-only controls

The default is **NVIDIA Nemotron 3 Super (free)**, selected from the public catalogue on 7 October. See [model research](OPENROUTER-MODELS.md) for alternatives and limitations. The configured ID must be a pinned `vendor/model:free` ID; paid IDs, generic routers and extra suffixes are rejected before transport.

Each request uses Chat Completions with a strict JSON schema, no tools/plugins, reasoning disabled, and bounded output (400 tokens for summaries, 1,200 for Q&A). Provider preferences require parameter support, sort by latency, disable provider fallbacks, and set `max_price` to zero for prompt, completion and per-request pricing. No paid-model fallback or automatic retry is configured. If a compatible free endpoint is unavailable, the request fails and the original report remains available. These request controls do not change account-wide billing settings or protect unrelated uses of the same key.

The user's $10 OpenRouter credit purchase is reported, not independently verified here. It does **not** authorise paid models or new purchases. OpenRouter currently documents 1,000 free requests/day after $10 lifetime credit purchases, still 20 requests/minute; provider capacity limits may also apply. Failed requests can count against quota. See [official limits](https://openrouter.ai/docs/api_reference/limits) and [the official explanation with numeric quotas](https://openrouter.ai/blog/tutorials/how-to-get-the-lowest-cost-llm-inference-on-openrouter/). A read-only `GET /api/v1/key` can report the account's actual daily allowance after the key is added; never log the key.

Record the authorised bounded live session privately in `.riverside/ai-credit-verification.json`:

```json
{
  "openrouter": {
    "id": "<unique ID for this genuinely approved test>",
    "freeOnlyConfirmed": true,
    "liveTestApproved": true,
    "verifiedAt": "<actual UTC ISO timestamp>",
    "expiresAt": "<actual UTC ISO timestamp, no more than 24 hours later>",
    "maxCalls": 1
  }
}
```

This is an operator's record, not automatic user consent. The example does not grant approval; current small checks and interactive use rely on the explicit standing authorisation above. Set the maximum to the approved count, never more; record expiry limits approval to a short session. Enable `RIVERSIDE_OPENROUTER_ENABLED=true` for the authorised session, restart, and disable it when the session is finished. The user has requested leaving the local app enabled for bounded interactive use. Attempts reserve a persisted allowance under `openrouter:<id>` before transport. Failures count; restart and demo reset do not restore the allowance. Do not change IDs to bypass it.

## Jev existing-credit controls

The Jev console was rechecked on 7 October: $5 available, auto-recharge off. A TypeSafe key is configured privately. The user explicitly permits bounded use of existing purchased credits. A provider-enforced hard stop remains unverified and must **not** be recorded as verified. The adapter now supports this distinct, capped approval mode without fabricating a hard-stop attestation:

```json
{
  "jev": {
    "id": "<unique authorised session ID>",
    "existingCreditUseApproved": true,
    "autoRechargeOffVerified": true,
    "availableCreditsUSD": 5,
    "verifiedAt": "<actual UTC ISO timestamp>",
    "expiresAt": "<actual UTC ISO timestamp, no more than 24 hours later>",
    "maxCalls": 20
  }
}
```

Record the actual checked balance, not the illustrative amount above. This mode requires at least $1 of checked existing credits, recharge off and at most 20 calls. It is a conservative local allowance, not proof of provider billing enforcement. Do not auto-renew it. The previous `creditOnlyConfirmed`/`providerHardStopVerified` mode remains supported only when those claims are actually verified. Never exhaust the balance to investigate billing. Current published Jev pricing is $0.042 per million input tokens, output free; account pricing/actual usage should be checked rather than inferred. [Official model pricing](https://docs.typesafe.ai/models).

## Guide and permissions

Review `data/event-guide.json` with the team. Its locations and instructions are fictional demo facts. Only after team approval set `approved:true` and restart. Public entries are available to all; staff entries only to Volunteer/Mo. Until approval, no guide entries are supplied to the LLM; live incident sources are permission-filtered independently.

Q&A always screens through Jev before using OpenRouter. If Jev is disabled or fails, chat offers an editable report draft instead of a factual answer. A free OpenRouter test alone therefore establishes summaries/LLM answering, not the full screened Q&A path. A report can trigger one Jev and one OpenRouter call; an informational chat can also call both. Count both when requesting approval. Models cannot dispatch, change permissions or resolve incidents. A draft stays **Not submitted yet** until the user confirms and the report endpoint succeeds.

## Verification and compatibility

Run `npm test`: transports are injected simulations, never live APIs. Each provider has a ten-second timeout, at most two concurrent calls and a 65,536-byte response limit. Unknown facts, invalid citations, provider refusal, truncation, malformed JSON and rate limits fail safely; no automatic retry is made. Record measured live results separately from simulated tests; a couple of examples do not establish reliability.

The existing `analysis.luna` and `session.ai.luna` fields remain the language-model slots for compatibility with saved records and existing clients. They now contain OpenRouter results/status; UI labels say OpenRouter or AI summary. New request allowances are recorded under `openrouter`, not `luna`, so old Luna proofs cannot enable the new provider. This is a transport replacement, with no changes to human workflow or source permissions.

## GPS assistance and first-aid lookup

[GPS assistance](GPS-ASSISTANCE.md) is independent of provider availability. Button-based station lookup makes no AI call; station-only Jev screening bypasses OpenRouter. Configured fictional stations have their own explicit Mo approval; the general guide still needs team approval. Matching is deterministic on the server and never sends structured GPS to either provider.
