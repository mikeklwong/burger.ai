# Contributing to burger.ai

For a bug report, include the screen, reproduction steps, expected and actual behavior, and browser/device. For an idea, explain how it improves sharing outfits, feedback, or discovery.

1. Read the [development guide](docs/development.md) and `AGENTS.md`.
2. Link a development Base44 app and use the local backend for test data.
3. Create a branch with a focused change and keep the existing React/Base44 conventions.
4. Run `npm run lint`, `npm run typecheck`, and `npm run build`. Report existing failures separately from failures introduced by your change.
5. Check affected screens with the configured backend. Include screenshots for visual changes.
6. Describe the problem, resulting behavior, and checks performed in the pull request.

Keep credentials, `.env` files, and personal user data out of commits and issues. Frontend `VITE_` configuration is visible to browsers; backend secrets belong in Base44 secret storage.

The archive in `archives/` is a historical snapshot. Edit the extracted application files for ongoing work.
