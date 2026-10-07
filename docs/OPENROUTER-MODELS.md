# Free model choice for Riverside

Researched 7 October 2026 using OpenRouter's public model catalogue and endpoint metadata. These were read-only, unauthenticated metadata requests; no inference was performed and no credits or inference quota were consumed. Availability can change.

## Default: NVIDIA Nemotron 3 Super (free)

Use `nvidia/nemotron-3-super-120b-a12b:free`. The checked free endpoint listed $0 input/output pricing, a 262,144-token context window, and support for `response_format`, `structured_outputs`, `max_tokens` and `reasoning`. Its sparse architecture activates 12B of 120B parameters. The official description emphasises efficient token generation; that makes it a reasonable candidate for short summaries and source-grounded Q&A, rather than a measured speed guarantee. [Model page](https://openrouter.ai/nvidia/nemotron-3-super-120b-a12b:free), [endpoint metadata](https://openrouter.ai/api/v1/models/nvidia/nemotron-3-super-120b-a12b:free/endpoints).

We disable reasoning, keep answers short, and request latency-based routing. The endpoint metadata returned no recent latency/throughput measurements, so there is no defensible seconds-per-answer claim. Free capacity can be busy. A ten-second timeout may yield unavailable responses under load; adjust only after measuring an approved bounded test. Provider-level structured-output support is required and the server independently validates every result. [Routing](https://openrouter.ai/docs/guides/routing/provider-selection), [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs).

## Alternatives considered

| Candidate | Why considered | Decision |
|---|---|---|
| Liquid LFM2.5-2.6B (`liquid/lfm-2.5-2.6b:free`) | Compact; checked endpoint supports schemas and has 65,536-token context | Optional manually selected comparison for small extraction/summary tasks. Liquid advises against knowledge-heavy tasks; prefer Nemotron initially for following context and sources. No live comparison performed. |
| Dots3-Note Preview (`dots-studio/dots-3-note-preview:free`) | Checked endpoint supports schemas; 512,000-token context | Larger context is unnecessary for our bounded sources; preview status and no speed measurements provide no clear advantage. |
| Random free router (`openrouter/free`) | Can select among available free models | Not used: pinning a model gives repeatable evaluation and avoids silently changing behaviour. |

Sources: [Liquid model](https://openrouter.ai/liquid/lfm-2.5-2.6b:free), [Dots endpoint metadata](https://openrouter.ai/api/v1/models/dots-studio/dots-3-note-preview:free/endpoints), [free router documentation](https://openrouter.ai/docs/guides/routing/routers/free-router). Alternate free IDs can be configured explicitly, but do not fall back automatically.

## Cost, quota and evaluation

OpenRouter documents 1,000 free-model requests/day after $10 of lifetime credit purchases, still 20 requests/minute; this is a higher quota, not unlimited requests. Provider availability also matters. The user's purchase and account-specific remaining quota have not been independently verified. [Official quota explanation](https://openrouter.ai/blog/tutorials/how-to-get-the-lowest-cost-llm-inference-on-openrouter/), [limits/key metadata](https://openrouter.ai/docs/api_reference/limits).

The implementation accepts only pinned `:free` model IDs and sends zero maximum prompt/completion/request pricing with no provider fallbacks, plugins, tools or automatic retries. If free service is unavailable, return unavailable rather than spending from the purchased balance. Account settings and other applications are outside this request's controls.

**Ask the user before any live test, including free inference.** Suggested next check, after private key configuration and approval: at most two OpenRouter calls, one summary of a fictional incident and one grounded answer with a known source. Expected token charge: $0 on the selected free endpoint; it uses up to two requests of quota. Keep Jev disabled for this isolated adapter check, so no TypeSafe credits are used. This would measure only two examples, not establish reliability or full screened Q&A. Jev/full-workflow tests require their own explicit approval and verified billing controls. See [AI-SETUP.md](AI-SETUP.md).
