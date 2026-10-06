# Guide 1 · Tools: beyond the chat box

You've probably used ChatGPT or Claude to explain things or draft text. For building, there's more on offer.

## Chat apps (ChatGPT, Claude, Gemini)

The easiest place to start.
- **Live previews.** Ask for an app or a page and it builds it right in the chat. Claude calls these *artifacts*; in ChatGPT, code blocks have a *Preview* button. You can click around in it and ask for changes.
- **Projects.** A shared space for your files and instructions, so every chat in it starts with the same background. Upload `ALL-IN-ONE.md` here.
- **Model picker.** You choose which model answers. See [Guide 4](4-models-and-cost.md).
- **Extras:** web search, file upload, "thinking" or research modes. They're useful, but heavy on usage, so switch them on when you need them.

## Coding agents (Claude Code, Codex, Cursor, Claude Cowork, VS Code agents)

These work directly on files in a folder on your computer. They can create and edit files, run things, and fix their own errors. That makes them more powerful, with slightly more setup.

What's different:
- **They read an instructions file automatically.** `AGENTS.md` (Codex, Cursor and others) or `CLAUDE.md` (Claude Code). It's a standing brief the agent reads every session. This pack includes both.
- **Plan mode.** Many agents can plan without touching anything, then build once you approve. Use it.
- **Slash commands.** Type `/` to see your tool's commands, e.g. to clear the chat, compact it ([Guide 3](3-context.md)), or switch model.
- **Permissions.** They'll ask before running commands or editing files. Read what they're asking before you approve.
- **Subagents.** Some can launch separate AI workers for a side job (research, a review), each with its own clean memory. Useful, but one agent is usually enough.
- **Checkpoints.** Ask the agent to "commit" (save a checkpoint) every time something works, so you can always go back.

## What's free (as of 6 Oct 2026; check before relying on it)

- **ChatGPT Free** includes **Codex** (the command-line and VS Code versions), with limits.
- **Cursor** has a limited free tier.
- **Claude Code** needs a paid Claude plan (Pro, US$20/month).
- Claude and ChatGPT chat apps both have free tiers with usage limits. Sharing a Claude artifact as a link needs a paid plan (Pro or Max).

**Not sure? Start with a chat app.** Move to a coding agent if you outgrow it.
