# Development guide

## Requirements and startup

Install Node.js 22.12 or newer (with npm). No Base44 account, database service, Stripe keys, or environment file is required.

```bash
npm ci
npm run dev
```

Open http://localhost:5173. This command starts the Node API on port 3001 and Vite on port 5173. If either process fails, both stop. Press Ctrl+C to stop them. Avoid running another copy on the same ports.

## Data and authentication

The server creates `.data/database.json` and `.data/uploads/` automatically. Users of the same server share its posts and accounts. Passwords use salted scrypt hashes; sessions use HttpOnly cookies and expire after seven days. Private collections and user-owned edits are checked on the server. Back up the entire data directory together and keep it out of git.

**Try the demo** creates a guest account and signs it in immediately. Sample posts are local outfit illustrations, not real users or AI-generated photographs. Register with an email and password to keep a normal account. This edition does not send verification or recovery emails and does not support Google login.

To recover an account, stop the server first, then run:

```bash
npm run reset-password -- user@example.com
```

This operator-only command prints a new password and invalidates the account's sessions. Share it privately with the account owner and restart the server. Do not run this command while the server is running.

## Optional AI

The platform works without AI credentials. By default, style notes summarize the selected category and tags, and recommendation vectors are deterministic tag/category features. This mode does not inspect image content or perform automated image moderation.

To enable real image descriptions and an automated explicit-image check, create an optional `.env`:

```dotenv
OPENAI_API_KEY=your-own-key
OPENAI_MODEL=gpt-4.1-mini
```

Restart the app after changing it. The backend sends the uploaded image to OpenAI only when the operator configures this key. API usage may incur charges to that operator. The key stays on the server. Choose a vision model available to your account; model availability is not needed for the rest of the app. The integration uses image inputs documented in the [official OpenAI vision guide](https://developers.openai.com/api/docs/guides/images-vision).

If the provider is unavailable, posting still works with tag-based notes. The response records whether the notes came from AI or tags; failed moderation is marked unchecked. Automated moderation is not a replacement for reports or a human moderation process.

## Build and self-host

```bash
npm run build
npm start
```

Open http://127.0.0.1:3001. The same Node server serves the built frontend and API. Hosting requires a Node process and persistent writable disk; a static-only host or GitHub Pages cannot run this backend.

Optional production environment settings:

| Setting | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | Production HTTP port |
| `HOST` | `127.0.0.1` | Bind address; set `0.0.0.0` behind your hosting provider's HTTPS proxy |
| `DATA_DIR` | `.data` | Persistent database and upload directory |
| `COOKIE_SECURE` | unset | Set `true` when serving through HTTPS |
| `OPENAI_API_KEY` | unset | Enable optional image analysis |
| `OPENAI_MODEL` | `gpt-4.1-mini` | Vision model used by the optional provider |

For a public installation, use HTTPS, keep the data directory private, and arrange backups and moderation. This file-backed backend is intended for small single-process instances. It is not a distributed database and does not provide production email delivery or a complete moderation/admin dashboard. All edition features are free; there is no payment flow.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Tests create isolated temporary stores and cover registrations, sessions, uploads, posting, rating replacement and aggregates, comments, follows, notifications, blocking, private collections, ownership, cross-origin mutation rejection, account deletion, AI fallback, and persistence across restarts. Real paid AI calls are not used in tests.

The frontend type check retains `checkJs: true` and covers application JavaScript, JSX, TypeScript, and imported shared components. Shared ref components have explicit prop types; errors are not hidden with suppression comments.
