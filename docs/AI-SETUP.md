# Jev and OpenRouter setup

Updated 7 October 2026. Jev handles classification and chat safety screening; OpenRouter replaces the former direct OpenAI/Luna connection for summaries and grounded Q&A. Neither real provider has been exercised by this chat. Both live flags remain off. The TypeSafe key is present privately; an OpenRouter key still needs configuring. The fictional guide is unapproved.

## Required approval before live tests

**Ask the user explicitly before every bounded real-provider test.** State provider, purpose, maximum number of calls and estimated cost if known; disclose unknown cost. This includes free OpenRouter inference, which uses request quota. A key, credit balance, previous setup request or verification file is not permission. No live test is currently approved. Default to simulated providers, including browser checks.

Never spend down the balance to test whether a provider buys more credits or stops at zero. Verify billing controls through read-only settings/documentation and simulate exhaustion locally. Do not buy credits, enable automatic recharge, expand a test allowance or repeat tests without fresh approval. The persistent instruction also lives in `AGENTS.md`, `CLAUDE.md` and `PROJECT.md`.

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

After the user approves a specific bounded test, record that approval privately in `.riverside/ai-credit-verification.json`:

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

This is an operator's record, not automatic user consent. The example does not grant approval. Set the maximum to the approved count, never more; record expiry limits approval to a short session. Only then enable `RIVERSIDE_OPENROUTER_ENABLED=true` for the agreed test, restart and return it to false afterwards. Attempts reserve a persisted allowance under `openrouter:<id>` before transport. Failures count; restart and demo reset do not restore the allowance. Do not change IDs to bypass it.

## Jev existing-credit controls

The Jev console showed $5 available and auto-recharge off on 7 October. A TypeSafe key is configured locally. Real responses and a provider-enforced stop against additional charges remain unverified; do not treat recharge-off alone as proof. Check settings and documentation read-only, never by exhausting credits. Leave Jev disabled if a hard stop cannot be verified.

After these checks and explicit approval for a bounded Jev test, add a separate `jev` entry to the same private verification file:

```json
{
  "jev": {
    "id": "<unique verified and approved Jev test ID>",
    "creditOnlyConfirmed": true,
    "providerHardStopVerified": true,
    "verifiedAt": "<actual UTC ISO timestamp>",
    "expiresAt": "<actual UTC ISO timestamp, no more than 24 hours later>",
    "maxCalls": 1
  }
}
```

This attests verified use of existing credits without additional charges; it is not an automatic balance check or permission to test. Do not assert an unverified hard stop. Enable `RIVERSIDE_JEV_ENABLED=true` only for the approved test and disable it afterwards. The same persisted allowance, timeout, concurrency and no-retry rules apply. Credentials and verification alone are insufficient to justify a test: ask the user first.

## Guide and permissions

Review `data/event-guide.json` with the team. Its locations and instructions are fictional demo facts. Only after team approval set `approved:true` and restart. Public entries are available to all; staff entries only to Volunteer/Mo. Until approval, no guide entries are supplied to the LLM; live incident sources are permission-filtered independently.

Q&A always screens through Jev before using OpenRouter. If Jev is disabled or fails, chat offers an editable report draft instead of a factual answer. A free OpenRouter test alone therefore establishes summaries/LLM answering, not the full screened Q&A path. A report can trigger one Jev and one OpenRouter call; an informational chat can also call both. Count both when requesting approval. Models cannot dispatch, change permissions or resolve incidents. A draft stays **Not submitted yet** until the user confirms and the report endpoint succeeds.

## Verification and compatibility

Run `npm test`: transports are injected simulations, never live APIs. Each provider has a ten-second timeout, at most two concurrent calls and a 65,536-byte response limit. Unknown facts, invalid citations, provider refusal, truncation, malformed JSON and rate limits fail safely; no automatic retry is made. Actual free-endpoint speed and answer quality remain untested until a separately approved live check.

The existing `analysis.luna` and `session.ai.luna` fields remain the language-model slots for compatibility with saved records and existing clients. They now contain OpenRouter results/status; UI labels say OpenRouter or AI summary. New request allowances are recorded under `openrouter`, not `luna`, so old Luna proofs cannot enable the new provider. This is a transport replacement, with no changes to human workflow or source permissions.
