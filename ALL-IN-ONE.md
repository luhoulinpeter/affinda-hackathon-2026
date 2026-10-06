# Affinda AI Innovation Challenge: Starter Pack (all-in-one)

*From the Affinda team. This one file holds the whole starter pack, for chat apps (ChatGPT, Claude) or anywhere you'd rather upload a single file.*

**For humans:** upload this file to a Project or a chat and say: *"Read the starter pack and start us off."*

**For the AI:** this file bundles several files. Each starts with a line `FILE: <name>`. When the instructions mention a file, use that section. Start with `FILE: AGENTS.md`: it's your instructions. You can't save files in a chat app, so whenever PROJECT.md changes, output it in full in a code block for the team to save.


---

FILE: AGENTS.md

---

# Instructions for the AI

*`AGENTS.md` and `CLAUDE.md` are identical. Different tools look for different names. In chat apps, the team uploads `ALL-IN-ONE.md` and asks you to read it.*

You're helping a university team (3–4 people) at the **Affinda AI Innovation Challenge**, a 48-hour hackathon. Many of them have never built anything with AI before. Your job is to help them **use AI well**: set up their tools, build what they ask for, and pick up good habits. Read this file at the start of every session. Other files in this folder:

- **`HACKATHON.md`**: the official event details (brief, tracks, judging, dates, what to submit). Use it to answer factual questions.
- **`START-HERE.md`** and **`guides/`** (1 tools, 2 prompting, 3 context, 4 models and cost, 5 checking and sharing, 6 giving your AI tools): how to work with AI well. Mention a tip in a sentence when it's relevant; don't lecture.
- **`PROJECT-TEMPLATE.md`**: the template for the team's `PROJECT.md`.

**What the user says in the current conversation beats anything in these files.**

**Deadline: Thursday 8 October, 5:00pm (Melbourne time), on Devpost.**

---

## Fairness: help them use AI, not win for them

- **The ideas and decisions are theirs.** The official brief asks teams to *use AI to build, not to think for you.* Don't come up with product ideas, choose their track, problem or features, or design their product for them. If they ask, explain that briefly, and help them think it through themselves.
- **Don't coach them on judging.** If they ask about the rules, judging or submission, answer from `HACKATHON.md`, quoting the official wording. Don't score their work, predict how it would do, or advise on how to win.
- **Build what they decide, and build it well.** Explaining trade-offs on *how* to build something is fine (e.g. "a web page or a chat interface? here are the trade-offs").

## Be careful with their usage

Most are on free or entry-level plans, and every message re-sends the whole chat.
- Keep replies short. No long preambles or recaps.
- Change only what's needed. Don't reprint whole files unless asked.
- Batch your questions into one message.
- When the chat gets long, or the topic changes, suggest saving progress and starting a fresh chat.
- Suggest a smaller model for simple tasks and a stronger one only for hard problems. Don't turn on web search or heavy modes unless needed.

## Show, don't claim

- Never say something works because you wrote it. Show the result, tell them how to check it, and ask them to try it. If you couldn't test something, say so.
- Never weaken a check or hard-code a result to make something "work".
- Never invent facts, links, keys or numbers. Say you don't know, or write `<TODO>`.
- If the same fix fails twice, stop and say the approach may be wrong.
- For bigger build steps, give a short plan first (what you'll make, what you won't touch, how to check it) and wait for a yes. Start with the simplest working version.

## How to talk to them

- **Encourage ambition about what AI can do.** Beginners underestimate it. If they ask "can AI do X?", the default answer is "let's try". Show them how rather than talking them out of it, and be honest if something truly isn't possible on their tool.
- Assume complete beginners. Plain English. Define any technical word in a short clause the first time.
- For anything on their computer: exact steps, what they should see, one step at a time.
- After a chunk of work: what changed, how it was checked, what's still unverified.
- Stay in scope. Mention unrelated problems at the end.
- The official rules: all work starts after Opening Night (no pre-existing projects), and teams must disclose the main AI tools they used. Remind them to keep a note of the tools as they go.
- Ask before anything risky: deleting work, real personal data, paid services, making things public. Keep API keys out of anything shared.

## Things they might say

- **"Start us off":** welcome them in two sentences. Ask in one message which tool and plan each person has, and whether anyone has coded before. Help them get set up. If they're using a coding agent, ask whether they have a GitHub account; if they'd like one, walk them through creating a free account and connecting it (browser sign-in only, never ask them to paste a password or token into the chat), then put the project in a new repository and push after each working step (see `guides/5-checking-and-sharing.md`). Offer to create `PROJECT.md` from the template (in a chat app, output it in full for them to save). Mention the usage tips in `guides/4-models-and-cost.md`.
- **"Save our progress":** update PROJECT.md (decisions with reasons; status, counting only things actually checked; traps; next step). Flag contradictions instead of overwriting. Output the full file and remind them to start the next chat from it.
- **"Check our work":** set up a review by someone who didn't build it. If your tool can launch a subagent, give it only PROJECT.md and the work, and ask it to test against what PROJECT.md says, flagging real problems only. Otherwise give them a short prompt to paste into a new chat.
- **"How do I...?"** (tools, setup, publishing, saving versions): answer step by step, using `guides/` where it helps.

## Default build path

- **Chat apps:** build in the app's live preview (Claude artifacts; ChatGPT code blocks with Preview). Share a link if their plan allows it, or export a single HTML file to host free.
- **Coding agents:** start with a single `index.html` that opens by double-click. No installs, no server. Save a checkpoint (commit) after each working step.
- Not sure a feature exists on their tool or plan? Say so, and suggest a quick test.

---

FILE: START-HERE.md

---

# Start here

*From the Affinda team: a starter pack for anyone who uses ChatGPT or Claude for uni but hasn't built anything with AI yet.*

This page is the essentials. The `guides/` folder goes deeper if you want it. The pack teaches you **how to use AI**, not what to build. The ideas are up to you.

## Set it up (5 minutes)

**Chat apps (ChatGPT, Claude):** create a **Project** for your team, upload **`ALL-IN-ONE.md`** (the whole pack in one file), and say: *"Read the starter pack and start us off."*

**Coding agents (Claude Code, Codex, Cursor, Cowork, or an agent in VS Code):** unzip this folder, open it in your tool, and say: *"Read AGENTS.md and start us off."* Many tools read it automatically.

Not sure which? Start with a chat app. [Guide 1](guides/1-tools.md) explains the difference.

## The tips that matter most

1. **Assume AI can do anything, then work back from there.** Beginners ask for too little. Ask for what you actually want. If it can't, you'll find out in one message.
2. **Plan with a strong model, build with a cheaper one.** Get the smartest model you have to write a clear plan, save it, then switch to a cheaper model to build it step by step. [Guide 4](guides/4-models-and-cost.md)
3. **Ask for a plan before it builds anything.** Fixing a plan is cheap. Undoing a build isn't. Start with the smallest version that works, and for anything visual, look at one screen before it builds the rest. [Guide 2](guides/2-prompting.md)
4. **Long chats rot.** The longer a chat runs, the more it forgets and contradicts itself, and the more of your usage each message costs. Keep your project in a `PROJECT.md` file, and hand over to a fresh chat often. [Guide 3](guides/3-context.md)
5. **Every message re-sends the whole chat.** That's why long chats burn through your limit. Short chats, the right model and one task per chat make it last. [Guide 4](guides/4-models-and-cost.md)
6. **"It works" is a claim, not proof.** Click it yourself, try messy real-looking inputs, and get a fresh chat to check the work. [Guide 5](guides/5-checking-and-sharing.md)

## Handy things to say to your AI

| Say | When |
|---|---|
| *"Start us off"* | First session |
| *"Save our progress"* | End of a session, or when a chat gets long |
| *"Check our work"* | After you've built something |
| *"How do I...?"* | Any time |

## The deadline

**Submissions close Thursday 8 October, 5:00pm, on Devpost.** Register your team and pick your track by **Wednesday 5:00pm**. The key event details are in `HACKATHON.md`, summarised from the organisers' pages, and everything official lives on the [Hacker Hub](https://groovy-prune-775.notion.site/Affinda-AI-Innovation-Challenge-Hacker-Hub-3f01e973de58814e8252e20bd9d81f5b). If anything here disagrees with the official guide or announcements, **the official version wins**.

## What's in the folder

| File | What it's for |
|---|---|
| `START-HERE.md` | This page |
| `guides/` | Optional deep dives: 1 tools · 2 prompting · 3 context · 4 models and cost · 5 checking and sharing · 6 giving your AI tools (libraries like GSAP, skills, connectors) |
| `HACKATHON.md` | The official event details |
| `PROJECT-TEMPLATE.md` | Your project's memory file (your AI can set it up) |
| `AGENTS.md` / `CLAUDE.md` | Instructions for the AI (identical; you don't need to read them) |
| `ALL-IN-ONE.md` | Everything in one file, for chat apps |

Have fun with it.

---

FILE: HACKATHON.md

---

# The hackathon: the official details

> Summarised from the organisers' Hacker Hub, Track Guide, Judging criteria and Devpost pages as of **Tue 6 Oct 2026**. Nothing here is extra advice from this pack. Wording is shortened in places. If anything here differs from the official pages or announcements, **the official version wins**.

## Official links

- **Hacker Hub** (everything in one place): https://groovy-prune-775.notion.site/Affinda-AI-Innovation-Challenge-Hacker-Hub-3f01e973de58814e8252e20bd9d81f5b
- **Track Guide:** https://groovy-prune-775.notion.site/Affinda-AI-Innovation-Challenge-Track-Guide-3ef1e973de588137b302fd544dfc1a76
- **Judging criteria:** https://groovy-prune-775.notion.site/Judging-criteria-3ef1e973de58814fb3ffe493d04367dd
- **Devpost** (submissions and rules): https://affinda-challenge.devpost.com/
- **Discord** (all announcements, questions, team-finding): https://discord.gg/DZgMfVRfr
- **Team registration form** (one person per team): https://forms.gle/kL6HoJAnumiAe8Ry8
- **Track selection form** (one person per team): https://forms.gle/71QCPtin8XqmcvLf7
- **Tickets** (every member needs one): https://events.humanitix.com/affinda-ai-innovation-challenge

## The event

- **Name:** Affinda AI Innovation Challenge, a four-day AI build challenge run by Enactus Melbourne × CISSA × Affinda at the University of Melbourne. Open to current Australian university students, any degree.
- **Teams:** 3–4 people; each person on one team only. Teams under 3 may be asked to merge. Team matching happens at Opening Night.
- **Opening Night:** Tue 6 Oct, 5:30–7:30pm, Laby Theatre (David Caro Building). Strongly recommended.
- **Register your team and pick your track:** both forms close **Wed 7 Oct, 5:00pm**. Use the same team name on both.
- **Build days (optional drop-in rooms), 9:00am–2:30pm:**
  - Wed 7 Oct: L1-107, 100 Leicester St (Building 278)
  - Thu 8 Oct: G20 Collaborative Learning Space, Old Howard Florey Laboratories (Building 183)
- **Submissions close: Thu 8 Oct, 5:00pm, on Devpost.** Late submissions aren't accepted, and a draft isn't a submission.
- **Finalists announced:** Fri 9 Oct, 2:00pm, on Discord (about 8 teams).
- **Closing Night:** Fri 9 Oct, 6:00–9:00pm, Singapore Theatre (Glyn Davis Building). Finalists pitch live and must attend in person to be eligible for prizes.

## Rules worth knowing

- **All work happens between Opening Night and the deadline.** No starting early and no pre-existing projects.
- **AI tools are allowed and encouraged.** Disclose the main AI tools you used. Every team member should be able to explain how your product works.
- **The Fieldday case is fictional.** Don't use real personal data; make up realistic sample data.
- **Links must stay public and unchanged** until judging has finished.
- A code of conduct applies. Contact the organisers through Discord or guobin.zheng@enactusmelbourne.com (no DMs to organisers).

## What to submit

**On Devpost by Thu 8 Oct, 5:00pm** (one submission per team, every member added):
- Project name, tagline and your chosen track.
- A **working prototype**: a link, or clear steps to try it. Any tools, including no-code. Mock-ups alone won't be enough.
- A **demo video**, up to 5 minutes, with commentary, at a **public link** (e.g. unlisted YouTube, Google Drive, Loom).
- A **short description**: the problem, who it's for, what you built, how AI is used, the ideas you considered and why you chose this one, and the tools you used (including AI tools).
- Optional: GitHub repo, slides.

Incomplete submissions may not be considered for the final round or prizes.

**Finalists, Fri 9 Oct at Closing Night:** a live 5-minute pitch and demo, then judges' questions. Slides encouraged.

## The brief

Fieldday Events is a five-person Melbourne events company that runs club nights and small gigs. The City of Melbourne wanted a new summer festival for young people, and Fieldday's founder, Jess, won it on the strength of her sold-out nights. The festival is **Riverside**: three days on the riverfront in mid-December, with up to **15,000 people a day**. The condition: if Fieldday isn't on track two weeks out, it must pay an experienced production company to take over. Riverside goes ahead either way, but paying for a takeover would wipe out the company. Fieldday has ten weeks to deliver **60 artists, 40 food vendors, 300 volunteers and 15,000 people a day, with five staff**.

You're a friend of Jess's who knows how to build with AI. She's asked you to show her, in 48 hours, how AI could let her team pull this off.

**The challenge: Build an AI-powered product that helps Fieldday successfully deliver Riverside at a scale they've never operated before.**

**One-sentence version:** pick one of three people (or groups) at Riverside, find a real moment where things go wrong for them, and build a product where AI does something that wasn't possible before.

**What you can assume:**
- No coding experience needed. No-code, AI coding tools and vibe coding are all welcome. Judges score the product and the thinking, not the code.
- Start fresh. Fieldday has no existing systems to plug into.
- Go narrow. Solve one problem well, not the whole festival.
- AI should do real work in the product, not just sit on top of it.
- Fill in the details. Anything the brief doesn't say, you can decide, as long as it's realistic.
- Use AI to build, not to think for you. The ideas and decisions should be your own; judges will ask about them.

**Skip the obvious first idea:** a festival chatbot or a problem-flagging dashboard. They aren't penalised, but most teams will have them first, and they find it harder to score on Originality. The strongest entries start from a specific person in a specific moment.

## The three tracks

**Track 1: Backstage** (Artist & Vendor Operations). Building for Jess and Ravi, the production manager.
- 60 artists and 40 vendors, each with their own needs, paperwork and last-minute changes. Artist "riders" (stage, tech and hospitality needs) arrive as PDFs, emails and photos of handwritten notes. Vendors send permits, food-safety certificates and insurance. The run sheet is a spreadsheet that changes daily.
- What breaks: problems hide in the gaps between documents. A rider that doesn't match a stage's equipment, a certificate that expires before the event, a set time that moved but nobody told catering.
- Real constraints: Ravi lives in his inbox and phone and is rarely at a desk. Vendors are small businesses; some don't read English well and would rather call than fill in a form.
- Example moments: 4pm Saturday, a headliner's flight is cancelled and their set is at 9:15pm. A vendor emails at 11pm the night before bump-in: their gas certificate is "coming".
- Directions: one source of truth; catching clashes early; when the plan moves; doing, not just flagging (draft the email, update the run sheet, with a person approving); helping artists and vendors get it right the first time.

**Track 2: Front Row** (Festival Experience). Building for festival-goers, up to 15,000 a day.
- A bigger, broader crowd than Fieldday has ever had: first-timers, families, people with disabilities, people who don't speak much English. Today Fieldday runs on an Instagram account, a ticket link and DMs.
- What breaks: getting in, losing friends, last-minute changes, accessibility, getting home. Five staff can't answer thousands of messages.
- Real constraints: 5% battery and patchy signal in a crowd; loud, bright, one hand free; you might be 16 at your first festival, 70 in a wheelchair, or new to Australia.
- Example moments: 10:30pm Saturday, the main stage finishes and thousands head for the gates while trains run late. Your friend's phone died at 6pm and you've lost each other.
- Directions: before you arrive; finding your way and your people; when the day changes (heat, storm, set moves); everyone's festival (access, language, age); doing, not just answering.

**Track 3: Ground Control** (Crew & Safety Operations). Building for Mo, the safety lead, and the volunteer coordinator.
- 300 volunteers across three hot December days. Rosters live in a group chat; incidents come in by radio and get written up the next morning.
- What breaks: different availability and skills, no-shows and swaps on the day; incidents (heat, injuries, lost children, crowding) arriving faster than one person can track.
- Real constraints: Mo is on foot with a radio earpiece and a phone in a pocket, so long screens don't get read mid-incident. Volunteers are mostly students who won't read long messages. Radio traffic is short, noisy and disappears once said.
- Example moments: 2pm Saturday, 38°C, two first-aid volunteers haven't shown up and the water queue is 40 deep. 6pm Sunday, a storm warning for 7pm and the open-air stage is packed.
- Directions: building a fair roster; repairing it on the day; making sense of the noise; preparing for what could go wrong; doing, not just flagging. **Every decision about people's safety stays with a person.**

## How you're judged

Scored out of **100**, the same for every track.

| Criterion | Points | What judges ask |
|---|---|---|
| **Problem understanding** | 15 | A specific user and moment (8). What makes it hard (7). |
| **Product thinking** | 15 | Focus and trade-offs (8). Ideas considered (7). |
| **Use of AI** | 25 | AI does meaningful work (15). Used responsibly (10). |
| **User experience** | 15 | Fits the user's real situation (8). Clear and trustworthy (7). |
| **Originality** | 15 | Beyond the obvious first idea (10). Creative use of AI (5). |
| **Execution and communication** | 15 | It works; interactive beats mock-ups (10). A clear story (5). |

Each item is marked Exceptional (100% of its points), Strong (80%), Solid (60%, stays close to the brief), Partial (40%) or Weak (20%). The full descriptions are on the Judging criteria page.

Chatbots and dashboards aren't penalised; they're judged like anything else.

## Prizes

- **1st:** $300 + priority interviews for Affinda's Summer Internship (up to 4 per team; a guaranteed interview, not a guaranteed offer)
- **2nd:** $300 · **3rd:** $100
- **Best in each track:** $100. Track prizes go to the highest-scoring team in each track; ties go to the higher Originality score.
- A team can win a placing and a track prize.

---

FILE: guides/1-tools.md

---

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

---

FILE: guides/2-prompting.md

---

# Guide 2 · Prompting: getting good work out of AI

Good prompting isn't magic words. It's giving a capable stranger what they need to do a good job.

## Its habits, and what to do about them

| Its habit | What to do |
|---|---|
| **It does more than you asked** (you ask for a button, you get three files and a settings page) | Ask for a plan first, and the simplest version |
| **It fills gaps by inventing** (facts, links, numbers) | *"If you don't know, say so. Don't guess."* |
| **It agrees with you** | *"What's the strongest argument against this?"* |
| **It's confident when it's wrong** | Check the real thing ([Guide 5](5-checking-and-sharing.md)) |

## How to ask

1. **Say what you want, who it's for, and what "done" looks like.**
   - Weak: *"Make a booking app."*
   - Better: *"A one-page app where a café owner pastes a booking request and sees the date, time and party size pulled out, with a button to confirm. Done = it works on these three example messages."* *(Unrelated example.)*
2. **Plan first.** *"Don't build anything yet. Tell me what you'll make, what you won't touch, and how we'll check it works."* Push back, then say go.
3. **Start small.** One simple version working end to end, then add to it. For anything visual, get **one screen** made first and look at it before it builds the rest.
4. **One change at a time,** then check it.
5. **Show, don't describe.** Screenshots of what's wrong. The whole error message. A real example of the input.
6. **Ask it to explain.** *"Explain that like I've never coded."* You should understand what you've built.
7. **Ask for a report** after a chunk of work: what changed, how it was checked, what it couldn't check.

**The thinking is yours.** The organisers' brief asks you to *use AI to build, not to think for you.* Use AI to find holes in your plan, but bring the ideas yourself.

## Prompts worth stealing

- *"Before you start, ask me any questions that would change what you build."*
- *"What's the simplest way to do this? Don't add anything I didn't ask for."*
- *"Only change X. Don't rewrite anything else."*
- *"This has failed twice. Stop patching. What might be wrong with the approach?"*
- *"Show me how you know that."*

---

FILE: guides/3-context.md

---

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

---

FILE: guides/4-models-and-cost.md

---

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

---

FILE: guides/5-checking-and-sharing.md

---

# Guide 5 · Checking, saving and sharing

## Check its work

When an AI says something is done, that's a **claim, not evidence**. It isn't lying; it predicts what a finished answer sounds like. You don't need to read code to check. Judge what it *does*.

- **Click it yourself** after every change, the way a real user would. On a phone, if that's how it'll be used.
- **Ask for evidence:** *"Show me."* *"How do you know?"*
- **Try realistic, messy inputs.** "test 123" hides problems.
- **Never let it weaken a check or hard-code an answer** just to make something "work".
- **Two failed fixes means stop.** If the same thing breaks twice, the approach is probably wrong. Step back and simplify.

## Get a fresh pair of eyes

An AI that built something is bad at spotting its own mistakes, like proofreading your own essay. Open a **brand-new chat** (or, in a coding agent, a subagent), give it PROJECT.md and the thing you built, and ask:

> *"You didn't build this. Test it against what PROJECT.md says it should do. Flag only real problems: broken, missing, or confusing. No new features."*

Ask for real problems only. Tell an AI to hunt and it will always find something, including things that don't matter.

## Save working versions

- **Coding agents:** ask it to "commit" (save a checkpoint) every time something works.
- **Chat apps:** earlier versions are usually kept, but save your own copy before big changes too.

## Share it

- Some apps let you **share** what you've built as a link (for Claude artifacts this needs a paid plan, and viewers may need an account). Otherwise ask the AI for a single HTML file and help putting it on a free host, so judges can open it without logging in.
- **Test the link early** in a private/incognito window. Things that work on your laptop sometimes break when they go live.

## Optional: GitHub

**GitHub** is a free website that stores your project's code online. You don't need it in a chat app, but if you're using a coding agent it's worth five minutes:
- **Backup:** your work is safe even if your laptop isn't.
- **Teamwork:** teammates can get the latest version instead of passing files around.
- **A free live link:** *GitHub Pages* can host a simple website, so anyone can open your prototype without logging in.
- **Your submission:** you can add the repository ("repo") link to Devpost (optional).

You don't need to learn Git. Make a free account at github.com, then ask your coding agent: *"Connect to my GitHub account, put this project in a new repository, and explain each step."* After that, *"push this to GitHub"* saves the latest version online.

Two rules: **public repos are public**, so no API keys or real personal data, ever. And **never paste a password or access token into the chat.** If a login is needed, the agent should open a browser sign-in for you. (GitLab works the same way if you already use it.)

## Stay safe

- **No real personal data.** Use made-up examples.
- **API keys are passwords.** Never put them in a shared link, a public repo, or code that runs in a browser.

---

FILE: guides/6-giving-your-ai-tools.md

---

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

---

FILE: PROJECT-TEMPLATE.md

---

# PROJECT.md: [team name]

*Copy this to `PROJECT.md`. It's your project's memory: give it to every new chat, and update it at the end of every session. Keep it to about a page. Rename, add or delete sections however you like.*

## Team
- [name]: [role]

## What we're building

## Decisions
- [when] Decided... because...

## Status
Working (actually checked) / not working yet / next step.

## Traps
Things that wasted time, and the fix.

## Links
