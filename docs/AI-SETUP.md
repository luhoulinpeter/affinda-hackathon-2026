# Jev and Luna setup

The integration code is implemented; real account access and free-credit controls have not been verified. Neither key was present in the implementation session. The default app makes **no provider calls**. Tests use injected simulated responses, never live providers.

## Local credentials and free-credit controls

1. Sign in privately to [OpenAI API](https://platform.openai.com/) and [TypeSafe console](https://console.typesafe.ai/). Create restricted project keys where supported. Never paste a key into chat or commit it.
2. Check actual free-credit balances, expiry and provider-enforced hard stops. A spending alert or local request counter is **not** a guarantee against paid usage. Do not enable a provider if it can charge a card after credits expire, or if you cannot confirm a hard stop. Do not purchase credits or enable automatic top-ups for this task.
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

This record is an operator's attestation, **not an automatic balance check**. Choose a conservative call allowance that fits verified free credits at the provider's current prices and token limits. Add a `luna` entry only after checking OpenAI too. Use a new ID only for a genuinely new verification; changing IDs resets that allowance. Keep the file private, alongside the ignored local database.

5. Set the corresponding `RIVERSIDE_JEV_ENABLED=true` / `RIVERSIDE_LUNA_ENABLED=true` locally and restart. All three checks—key, enabled flag and unexpired verification—must pass. Every attempted request reserves a persisted call before sending; failures count. The app has no automatic retries. Allowances survive restarts. If the allowance is exhausted, calls fail closed; return flags to false when finished.

The local allowance supplements provider hard stops; it cannot independently enforce dollar billing. Neither provider's credit balance or billing protections can be verified from the repo. If either is unavailable, leave it disabled: reports still reach Mo, and chat explains that screening/answers are unavailable.

## Approve the fictional guide

Review `data/event-guide.json` with the team. All locations are invented demo facts, not real event instructions. Edit them as needed; only then set `approved` to `true` and restart. Public entries are available to all; `staff` entries only to Volunteer/Mo accounts. The JSON file is never served directly. Until approved, no guide entries are sent to Luna. Live incident sources remain permission-filtered independently of guide approval.

## Run and check

Run `node --test tests/*.test.cjs`. These are simulated integration tests. Start the app, submit a fresh fictional report, ask a new permitted question and inspect sources; test unknown information and a safety message. Only a fresh real provider response establishes live integration. A report draft says **Not submitted yet** until you confirm and receive a reference. For Mo, use the same chat draft to submit a new report.

Models: [`jev-latest`](https://docs.typesafe.ai/api), [`gpt-6-luna`](https://developers.openai.com/api/docs/models/gpt-6-luna). Luna uses the [Responses API structured-output format](https://developers.openai.com/api/docs/guides/structured-outputs), `store:false`, no tools and bounded output. Calls time out after ten seconds per provider, with two concurrent calls per provider. Q&A screens with Jev before calling Luna. Four exchanges remain only in page memory and clear on identity changes or refresh. Each request reloads permitted incident sources; conversation history is never authoritative evidence.

AI grounding and safety screening are probabilistic, not proof of accuracy. Review summaries against originals, factual answers against displayed sources, and ambiguous examples before using the prototype beyond fictional tests.
