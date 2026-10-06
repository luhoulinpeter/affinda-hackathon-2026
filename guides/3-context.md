# Guide 3 · Context: memory, context rot, and long tasks

## What "context" is

Context is everything the AI can see right now: this chat, plus any files you've given it. It has no memory beyond that. A new chat starts from zero, and **every message re-sends the whole chat so far** ([Guide 4](4-models-and-cost.md) covers what that does to your usage).

## Context rot

The longer a chat runs, the worse it gets. Early details get buried, and the AI starts to lose track. Signs a chat is rotting:
- It forgets something you decided earlier, or redoes work you already did.
- It brings back a bug you already fixed.
- It contradicts itself, or ignores an instruction it was following.
- It goes round in circles on the same problem.

When you see these, don't keep pushing. Reset.

## Your project's memory: `PROJECT.md`

Keep the important stuff in a file, not a chat. `PROJECT.md` (template in this folder) is one page any new chat, or teammate, can read and be up to speed in seconds: what you're building, decisions and why, what works, what's next, and traps you've hit. Chats are disposable. The file holds the state.

- **Start of a chat:** *"Read PROJECT.md, summarise where we are in 3 lines, then let's carry on."*
- **Saving:** *"Save our progress: update PROJECT.md with what we decided and changed, and give me the full file."*
- **What you say now beats the file.** If it's out of date, tell the AI and fix the file.

## Compact or hand over?

Two ways to deal with a long chat:

**Compact.** Many tools can summarise the chat so far and carry on from the summary. In coding agents, try typing `/compact`; some apps do it automatically when a chat gets very long.
- Good for: carrying on with **the same task** when the chat is just getting long.
- Catch: the tool decides what to keep, so details can quietly disappear. Each compaction loses a bit more. Automatic compaction in chat apps also uses extra usage.

**Hand over.** Save progress to PROJECT.md, then start a fresh chat from it.
- Good for: **switching tasks**, ending a session, a chat that's rotting or going in circles, or after you've already compacted once or twice.
- Why it's better: **you** decide what carries over, and the new chat starts clean and cheap.

**Rule of thumb:** compact to keep going, hand over to start fresh. When in doubt, hand over.

## Working on long tasks

Big jobs (a whole app, a multi-step feature) outlast a single chat. To keep them on track:
1. **Write the plan to a file first** (in PROJECT.md or a `PLAN.md`), with numbered steps.
2. **Do one step per chunk of work,** check it works, and tick it off in the file.
3. **Have the AI update the file as it goes,** not just at the end. If the chat dies or rots, nothing is lost.
4. **Checkpoint** (save a working copy, or commit) after each step that works.
5. **Hand over between big steps,** so each one starts with a clean chat that only has the plan and the current state.
6. **One task per chat.** Research, the build, and writing up should be separate chats.
