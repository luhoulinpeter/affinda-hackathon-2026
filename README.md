# Affinda Hackathon team workspace

This repository holds the team's project notes and a small browser prototype. Track 3 is confirmed; product details are still being refined. Read [PROJECT.md](PROJECT.md) for current decisions and deadlines, and [AGENTS.md](AGENTS.md) for AI coding guidance.

## Try the starter

1. Double-click `index.html`. No install or server is required for this local starter.
2. Select **Volunteer view**, click **Use example text**, then **Send report**. You should receive an incident reference and see the report under **Your reports**.
3. Select **Mo's view** and open the incident. Click **Acknowledge**: the open count should stay the same.
4. Click **Mark escalated**: it should still be open. Click **Confirm resolved**: the resolved count should increase, with Mo and the confirmation time in the record.
5. Submit another report with **Flag immediate concern for Mo** checked. It should appear ahead of ordinary open reports.

All people and examples are fictional. State lives in one tab and resets on refresh. The identity selector is a demo, not authentication. There is no connected AI, voice service, automatic assignment, server or deployment.

For the three-person work split, see [roles.md](roles.md). The implemented interface and next integration agreements are in [docs/STARTER-CONTRACT.md](docs/STARTER-CONTRACT.md).

## Folder structure

```text
src/
  js/ui/     Person 1: browser views
  js/domain/ Person 2: incident state and actions
  js/services/ Person 3: analysis adapter (currently a labelled stub)
  css/       Styles and layout
assets/      Images, icons and map artwork shown in the app
data/        Fictional sample incidents, volunteers and zones
server/      Future server code for private API calls
tests/       Automated checks as app behaviour is implemented
docs/        Product drafts and technical notes
guides/      Original hackathon guides for working with AI
```

Keep `README.md`, `PROJECT.md`, `AGENTS.md`, `CLAUDE.md` and the starter-pack files at the top level so teammates and AI tools can find them. The [incident MVP draft](docs/INCIDENT-MVP-DRAFT.md) lives in `docs/`; it contains proposals as well as confirmed decisions.

The local app uses HTML, CSS and JavaScript without packages. The `server/` folder remains reserved for private API calls and shared storage.

## First implementation

`index.html` links styles from `src/css/` and classic scripts from `src/js/`. The text journey is implemented; extend it in small working steps.

Use `assets/` for displayed files and `data/` for fictional examples. Fixtures are a classic JavaScript file so no local JSON fetch is needed. Keep this double-click path until a server is ready.

Private Jev or transcription API calls belong in `server/` once a server is implemented. See [server/README.md](server/README.md). Never add a provider key to the browser adapter.

## Check the workflow rules

With Node.js already installed, run `node --test tests/incidents.test.cjs`. These checks cover explicit human resolution, role restrictions, retained reports when analysis fails, concurrent reports and invalid input. Also click through the steps above; automated rule checks do not verify the browser interface or phone behaviour.

## Collaborating

1. Clone this repository and read `PROJECT.md` before starting work.
2. Create a short branch for each task, such as `issue-input` or `classifier-test-cases`.
3. Commit and push your changes, then open a pull request for a teammate to review.
4. Merge working changes into `main` frequently; update `PROJECT.md` when the team makes a decision or verifies a result.

Keep API keys in a local `.env` file, which Git ignores. Share required variable names through `.env.example`, never the values. Use fictional festival data.

The repository is private while the team develops. Only invited GitHub collaborators can access it.
