# Jev and Luna setup

The integration code is implemented; live provider responses and credit-only billing controls remain unverified. On 7 October 2026 the Jev console showed $5 available with auto-recharge off; a subsequent local check confirmed a TypeSafe key is present without reading it into chat. Both live flags remain disabled and no verification record exists. ChatGPT subscription sign-in is not implemented. Tests use injected simulated responses, never live providers.

## Required approval before credit-consuming tests

The user's instruction on 7 October 2026 applies to all future chats and agents: **ask explicitly before any real-provider test that consumes credits or subscription allowance**. Key configuration and available credits are not permission to test. Before asking, specify the provider, purpose, maximum number of calls and estimated cost when known; disclose unknown cost. Approval covers only that bounded test, not retries, repeated tests or later runs. Default to simulated providers and leave live calls disabled until setup checks and approval are complete.

**Never spend down the balance to test whether the provider buys more credits or stops at zero.** Check billing controls through read-only settings and official documentation; test exhaustion with simulated responses and a local allowance. Do not purchase more credits or enable automatic recharge. If billing protections cannot be verified without spending, record that uncertainty and leave the provider disabled.

The original free-credit-only plan predates the user's existing Jev credit balance. Do not buy additional credits or assume the user has approved consuming that balance in tests. The existing `creditOnlyConfirmed` verification field means usage is restricted to verified existing credits with no additional charges; it does not establish test approval.

## Local credentials and free-credit controls

1. Sign in privately to [OpenAI API](https://platform.openai.com/) and [TypeSafe console](https://console.typesafe.ai/). Create restricted project keys where supported. Never paste a key into chat or commit it.
2. Check existing-credit balances, expiry and provider-enforced hard stops using read-only settings/documentation, never by exhausting credits. A spending alert, auto-recharge-off setting or local request counter alone is **not** a guarantee against additional charges. Do not enable a provider if it can charge a card after credits expire, or if you cannot confirm a hard stop. Do not purchase credits or enable automatic top-ups for this task.
3. Copy `.env.example` to `.env` privately and enter keys there. The running server does not automatically load `.env`. With Node 20.6+ use `node --env-file=.env server/index.cjs`; with older supported Node versions provide environment variables through your own terminal setup. Restart after changes. Key values are never returned to the browser.
4. Only after verifying credit-only controls, create `.riverside/ai-credit-verification.json` privately, with one entry for each verified provider (`jev` and/or `luna`):

```json
{
  "jev": {
    "id": "unique-verification-record-id",
    "creditOnlyConfirmed": true,
    "providerHardStopVerified": true,
    "verifiedAt": "<actual UTC ISO timestamp>",
    "expiresAt": "<actual UTC ISO timestamp, at most 24 hours later>",
    "maxCalls": 10
  }
}
```

This record is an operator's attestation, **not an automatic balance check or permission to test**. Choose a conservative call allowance that fits verified existing credits at the provider's current prices and token limits and does not exceed the user's explicitly approved test count. The example count is illustrative, not authorised. Add a `luna` entry only after checking OpenAI too. Use a new ID only for a genuinely new verification; changing IDs resets that allowance. Keep the file private, alongside the ignored local database.

5. Set the corresponding `RIVERSIDE_JEV_ENABLED=true` / `RIVERSIDE_LUNA_ENABLED=true` locally and restart. All three checks—key, enabled flag and unexpired verification—must pass. Every attempted request reserves a persisted call before sending; failures count. The app has no automatic retries. Allowances survive restarts. If the allowance is exhausted, calls fail closed; return flags to false when finished.

The local allowance supplements provider hard stops; it cannot independently enforce dollar billing. Neither provider's credit balance or billing protections can be verified from the repo. If either is unavailable, leave it disabled: reports still reach Mo, and chat explains that screening/answers are unavailable.

## Approve the fictional guide

Review `data/event-guide.json` with the team. All locations are invented demo facts, not real event instructions. Edit them as needed; only then set `approved` to `true` and restart. Public entries are available to all; `staff` entries only to Volunteer/Mo accounts. The JSON file is never served directly. Until approved, no guide entries are sent to Luna. Live incident sources remain permission-filtered independently of guide approval.

## Run and check

Run `node --test tests/*.test.cjs`. These are simulated integration tests and do not call providers. Browser checks must also use simulated or disabled providers unless live testing has been explicitly approved. After obtaining approval for a bounded live test, submit a fresh fictional report or ask the agreed question and inspect the result; account for every enabled provider call (a report can invoke both providers; Q&A can screen through Jev then call Luna). Return live flags to false after the approved test. Only a fresh real provider response establishes live integration. A report draft says **Not submitted yet** until you confirm and receive a reference. For Mo, use the same chat draft to submit a new report.

Models: [`jev-latest`](https://docs.typesafe.ai/api), [`gpt-6-luna`](https://developers.openai.com/api/docs/models/gpt-6-luna). Luna uses the [Responses API structured-output format](https://developers.openai.com/api/docs/guides/structured-outputs), `store:false`, no tools and bounded output. Calls time out after ten seconds per provider, with two concurrent calls per provider. Q&A screens with Jev before calling Luna. Four exchanges remain only in page memory and clear on identity changes or refresh. Each request reloads permitted incident sources; conversation history is never authoritative evidence.

AI grounding and safety screening are probabilistic, not proof of accuracy. Review summaries against originals, factual answers against displayed sources, and ambiguous examples before using the prototype beyond fictional tests.
