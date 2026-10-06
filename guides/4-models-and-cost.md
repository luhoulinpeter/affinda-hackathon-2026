# Guide 4 · Models and cost: making your limit last

Most of you are on free or entry-level plans. Usage limits are real, and running out halfway through is a nightmare.

## Why long chats burn through your limit

AI doesn't remember your conversation. **Every time you send a message, the whole chat so far gets sent again** with it. So each message costs more than the last.

```
Message 1:   [1]                                → small
Message 10:  [1][2][3][4][5][6][7][8][9][10]    → 10x bigger
Message 30:  [1]............................[30] → 30x bigger, every single time
```

Big things you paste (files, long error logs, screenshots) ride along in *every* message after that too. *(Providers "cache" the repeated part so it's cheaper, but it still counts.)*

## Models and what they cost

Bigger models are smarter, slower, and use your limit much faster. Prices below are the official developer rates (US$ per million "tokens", roughly 750,000 words), checked 6 October 2026. You don't pay these in the chat apps, but **they show how hard each model hits your usage limit.**

| Family | Model | Input / output (US$ per million tokens) | Good for |
|---|---|---|---|
| Claude | **Haiku 4.5** | $1 / $5 | Quick questions, summaries, small edits |
| Claude | **Sonnet 5.5** | $2 / $10 | Most building |
| Claude | **Opus 5.5** | $4 / $20 | Planning, hard bugs |
| Claude | **Fable 5.1** | $10 / $50 | Rarely needed |
| OpenAI | **GPT-5.6 Luna** | $0.20 / $1.20 | Quick tasks (what ChatGPT Free uses) |
| OpenAI | **GPT-5.6 Terra** | $2 / $12 | Most building (Codex) |
| OpenAI | **GPT-5.6 Sol** | $5 / $30 | Planning, hard problems (paid plans) |

*In the ChatGPT app you don't pick these by name: Free uses Luna automatically, and paid plans also get newer GPT-6 models. In Codex you can choose the model.*

Rule of thumb for Claude: **Haiku is about half the cost of Sonnet, Opus about double, Fable about five times.** Prices change, so check the provider's pricing page if it matters.

## Plan with a strong model, build with a cheaper one

The single best use of a limited budget:
1. **Plan with your strongest model** (e.g. Opus or Sol). Have it ask you questions, then write a clear, step-by-step plan into a file.
2. **Switch to a cheaper model** (e.g. Sonnet or Terra) to carry out the plan one step at a time.
3. **Switch back up only if it gets stuck** on something hard.
4. **Use the cheapest model** (Haiku, Luna) for quick jobs: summaries, small edits, simple questions.

A good plan does the hard thinking once. The cheaper model then just follows it.

On a free Claude plan, the same idea works with Sonnet for planning and Haiku for small jobs.

## What free plans include (as of 6 Oct 2026; check before relying on it)

- **Claude Free:** Sonnet and Haiku (Opus and Fable need a paid plan). Limits reset on a rolling 5-hour window; paid plans add weekly limits too. No Claude Code.
- **ChatGPT Free:** Luna, with separate limits on uploads, images and tools. Codex included (command line and VS Code), with limits.
- **Cursor Free:** limited agent requests.
- Limits are measured by how much text goes back and forth, not the number of messages.

## Ten ways to make your limit last

1. **Plan before you build.** Wrong turns are the biggest waste.
2. **Hand over to a fresh chat often** ([Guide 3](3-context.md)). It resets the snowball.
3. **Match the model to the job** (above).
4. **One task per chat.** Research and writing go in separate, short chats.
5. **Batch your asks.** Three questions in one message beats three messages.
6. **Edit instead of piling on.** If it misunderstood, edit your last message and resend rather than adding "no, I meant...".
7. **Paste only what's needed.** The relevant lines of an error, not 500. Crop screenshots. Don't re-upload the same file.
8. **Ask for changes, not rewrites.** *"Only change the button colour."*
9. **Switch off extras** (web search, research and thinking modes) unless you need them.
10. **Spread across the team.** Side chats on teammates' accounts; save the best plan for the main build. If someone runs out, another person picks up from PROJECT.md.
