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
