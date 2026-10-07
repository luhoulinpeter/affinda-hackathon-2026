# Planned AI integrations

Updated 7 October 2026 after the team clarified that Jev is one of several AI integrations. This extends the original incident-response plan; it does not reinstate Armaan's revision. All integrations below are planned, not connected.

| Integration | Intended responsibility | Boundary |
|---|---|---|
| Jev | Structured category/decision suggestions and selecting among already eligible volunteers | The application's rules check eligibility and current coverage; validate any selected candidate again before offering a task |
| Separate LLM (large language model) | Interpret incoming language and permitted event/incident information; help make sense of that context; answer less urgent questions | Use only sources allowed for the current user; preserve original reports, distinguish uncertainty, and keep urgent concerns in the human incident workflow |
| Speech service, if voice is included | Turn recordings into editable text | Speaker checks the transcript before submitting; text entry stays available |

The LLM provider/model is not selected. The exact split between LLM interpretation and Jev category decisions needs agreement so that two integrations do not silently overwrite one another. A summary is not a replacement for an original report or a confirmed fact.

## Implementation agreements

- Run model calls through trusted server code and keep provider keys out of browser code.
- Retrieve context according to the signed-in role or original public reporter's ownership. Public Q&A, if selected, must not receive Mo's private queue or other people's reports. "Make sense of everything" means the information that user is permitted to access.
- Agree which event documents/data are authoritative and attach source references to factual answers. Missing or conflicting sources should produce an explicit unknown or a human handoff, not invented event information.
- Treat report text and retrieved content as data, not instructions that can change permissions or trigger actions.
- Keep model suggestions separate from validated application actions. Neither model can close an incident. Urgent/unclear incident routing must not wait behind conversational Q&A.
- If the LLM or Jev fails, retain reports and their human workflow. Keep the interface truthful about unavailable answers and unconnected services.

These are proposed implementation boundaries for the requested integrations, not additional product features or settled model choices.

## Team decisions still needed

1. Which users get Q&A: event-goers, volunteers, Mo, or a subset? Where should it appear?
2. Which documents and stored records should ground each user's answers?
3. Which LLM/provider can the team access, and what is the allowed API budget?
4. Which report fields should the LLM interpret, which decisions should Jev make, and how should conflicts/uncertainty reach a person?
5. Which questions count as less urgent, and what signals route them into incident reporting or human review instead?

## Three-person ownership

- Person 1: question/answer interface and visible sources after audience/placement is agreed; preserve the public, Volunteer and Mo views.
- Person 2: permission-scoped context retrieval, server endpoints, validated actions, persistence and failure handling.
- Person 3: separate Jev and LLM adapters, prompts, provider access, interpretation/routing/Q&A evaluation and transcription integration.

Before claiming integration, test a fresh report and an unfamiliar question with real calls. Check incorrect/unknown answers, urgent questions, provider failure and cross-role information access. Current code still uses the analysis stub and has no Q&A endpoint.
