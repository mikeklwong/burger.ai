# Project guidance

burger.ai is a standalone React/Vite frontend with a Node.js backend. The original Base44 export is preserved in `archives/burger-ai-source.tar.gz`; it is not part of the active runtime.

Read README.md and docs/development.md. Keep changes focused on the user request. Use `npm run dev` to start both processes. Test with `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

Server state lives in `.data/` and is ignored by git. Do not commit databases, uploads, session cookies, or API keys. Keep permission checks in the server; client-side checks alone are insufficient. Keep `checkJs` enabled and fix type errors at their source.
