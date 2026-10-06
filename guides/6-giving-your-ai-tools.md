# Guide 6 · Giving your AI tools

On its own, your AI writes everything from scratch and only knows what's in the chat. You can give it ready-made building blocks and connections to other apps, so it builds faster and better. You just have to know they exist and ask for them by name.

**Rule of thumb:** get the basic version working first, then add a tool when you hit a specific need. Each one adds setup, something new that can break, and some usage.

## 1. Libraries: ready-made code your AI can use

A **library** is a bundle of code someone else has already written and tested, which your AI can pull into your project instead of writing it from scratch. Most of them load with a single line, so they work even in a simple one-file web page. Name the one you want in your prompt, because AI often won't reach for them unprompted.

Some free, popular ones your AI already knows well:

| Library | What it does | Try asking |
|---|---|---|
| **GSAP** | Smooth, professional animation: things sliding in, cards you can swipe, transitions between screens | *"Use GSAP to make the cards slide in and swipe away smoothly."* |
| **Chart.js** | Charts and graphs | *"Show this data as a bar chart using Chart.js."* |
| **Leaflet** | Interactive maps | *"Add a map of these locations using Leaflet."* |
| **Tailwind CSS** | Quick, clean styling and layout | *"Style the page with Tailwind so it looks clean on a phone."* |

Animation and styling are polish, so add them **once the core works**, not first.

## 2. Instructions it remembers: projects, custom instructions and skills

Instead of repeating yourself every chat, you can save instructions the AI reads automatically:
- **Project instructions** (ChatGPT and Claude Projects): a short brief every chat in the Project starts with. This starter pack is one of these.
- **Instruction files** in coding agents: `AGENTS.md` or `CLAUDE.md`, read at the start of every session.
- **Skills** (in Claude and some other tools): saved, reusable sets of instructions for a particular kind of job, such as "how we write our reports" or "how to build a slide". The AI loads one when it's relevant.

If you find yourself typing the same instructions twice, save them in one of these.

## 3. Connections to other apps: connectors, MCP and plugins

Many AI tools can connect to other apps, so the AI can read and act in them directly instead of you copying and pasting:
- **Connectors / apps** (in the ChatGPT and Claude apps) link your AI to things like Google Drive, Notion, GitHub or Figma.
- **MCP** (Model Context Protocol) is the common standard behind many of these connections. You'll see the name in coding agents' settings. You don't need to understand how it works, just that "an MCP server for X" lets your AI use X.
- **Plugins** (in some coding agents) bundle several of these together: tools, skills and settings in one install.

Use them carefully:
- **Only connect what the task needs,** and never accounts with private or sensitive data. The AI can read whatever you connect.
- **They're heavy on usage.** Every connected tool adds to what's sent with each message. Turn off the ones you're not using.
- **Check what your plan supports.** Some of these need a paid plan.

## 4. Built-in tools you already have

- **Web search:** for current facts, prices or documentation. Switch it on when you need it, because it's heavy on usage.
- **File and image upload:** screenshots, PDFs and spreadsheets. Often faster than describing something.
- **Running code:** some chat apps can run code to analyse data or test something. Ask: *"Run it and show me the result."*
