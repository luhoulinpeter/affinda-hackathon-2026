# Server code

This folder is reserved for code that runs on a server, including future Jev and transcription integrations. No server, framework or API connection has been implemented or tested.

Keep credentials in local environment variables. Document required names in an `.env.example` file when an integration is added; never include real values. The repository already ignores `.env` files.

Anything delivered to the browser, including files in `src/`, `assets/` and `data/`, can be read by its users. Private API keys must stay on the server. Add setup, run and verification steps here when the server exists.
