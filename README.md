# Affinda Hackathon team workspace

This repository holds the team's project notes and the folder structure for its planned browser app. Track 3 is confirmed; product details are still being refined. Read [PROJECT.md](PROJECT.md) for current decisions and deadlines, and [AGENTS.md](AGENTS.md) for AI coding guidance.

## Folder structure

```text
src/
  js/        Browser JavaScript: interface behaviour and app logic
  css/       Styles and layout
assets/      Images, icons and map artwork shown in the app
data/        Fictional sample incidents, volunteers and zones
server/      Future server code for private API calls
tests/       Automated checks as app behaviour is implemented
docs/        Product drafts and technical notes
guides/      Original hackathon guides for working with AI
```

Keep `README.md`, `PROJECT.md`, `AGENTS.md`, `CLAUDE.md` and the starter-pack files at the top level so teammates and AI tools can find them. The [incident MVP draft](docs/INCIDENT-MVP-DRAFT.md) lives in `docs/`; it contains proposals as well as confirmed decisions.

No runnable app, framework, packages or server have been added yet. Empty code folders contain `.gitkeep` files so Git includes them when teammates clone the repository; remove those placeholders when adding real files.

## First implementation

Start with an `index.html` at the top level, linking styles from `src/css/` and scripts from `src/js/`. That first page should open by double-click without installs. Keep browser code separate from server code, and choose a framework only when the team needs one.

Use `assets/` for files displayed by the browser and `data/` for fictional examples. If the first version loads sample data, check that it works when opening `index.html` directly; browser requests for local JSON files can require a server.

Private Jev or transcription API calls belong in `server/` once a server is implemented. See [server/README.md](server/README.md). There is no app to run or test yet.

## Collaborating

1. Clone this repository and read `PROJECT.md` before starting work.
2. Create a short branch for each task, such as `issue-input` or `classifier-test-cases`.
3. Commit and push your changes, then open a pull request for a teammate to review.
4. Merge working changes into `main` frequently; update `PROJECT.md` when the team makes a decision or verifies a result.

Keep API keys in a local `.env` file, which Git ignores. Share required variable names through `.env.example`, never the values. Use fictional festival data.

The repository is private while the team develops. Only invited GitHub collaborators can access it.
