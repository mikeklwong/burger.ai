# burger.ai

**Rate fits. Find your people.**

burger.ai is an AI-powered fashion social platform with an Instagram-style photo feed. Share your outfits, rate other people's fits, receive community feedback, and discover creators whose style matches yours.

**Run it without any service configuration:**

```bash
npm install
npm run dev
```

Requires Node.js 22.12 or newer. Open **http://localhost:5173** and choose **Try the demo**, or register with an email and password. The app creates its database and upload folder automatically. No Base44 account, API key, or payment setup is needed.

This repository includes the React frontend, its own Node.js backend, local sample outfits, and the original source archive. People using the same running server share its data. Cloning the repository starts your own instance; it does not connect to a global network.

## Get started on the platform

1. Choose **Try the demo** for a guest account, or register and log in.
2. Complete onboarding: choose a unique handle and display name, optionally add a profile photo, and write a short bio.
3. Pick favorite style categories and follow tags to personalize your feed.
4. Follow suggested creators, then select **Enter burger.ai**.

Revisit onboarding through **Settings → Replay tutorial**.

## Find your way around

The bottom navigation keeps the main screens within reach:

| Screen | What to do there |
| --- | --- |
| **Home** | Browse **For You**, **Following**, or **Trending**. Use category chips to narrow the feed. |
| **Explore** | Search users or `#tags`, discover trending tags, and browse outfit grids by category. |
| **+** | Open **New Post** to upload an outfit. |
| **Activity** | Read notifications about interactions with your account. |
| **Profile** | View your outfits, followers, following, and saved collections. Open settings or edit your profile. |

**For You** combines style preferences, ratings, and interest signals with outfit similarity. **Following** shows posts from creators you follow. **Trending** highlights popular fits. Tap a creator's avatar or handle to visit their profile.

## Upload an outfit

1. Tap **+**, then pick or take an outfit photo.
2. Choose **Streetwear**, **Old Money**, **Business Casual**, **Formal**, or **Historical**.
3. Add tags and an optional caption of up to 300 characters.
4. Tap **Post fit** and wait for the image safety check and post creation.
5. The app attempts to generate an AI style description, then opens your post so you can see community feedback.

Everyone can share up to 20 outfits per rolling 24 hours. Upload PNG, JPEG, WebP, or GIF images up to 8 MB. The upload screen shows the remaining allowance. Without an optional AI key, style notes use your category and tags; no automated image-content check runs.

## Rate fits and receive feedback

Open an outfit and choose one of five ratings:

| Rating | Score | Meaning |
| --- | --- | --- |
| 🍔 **Burger** | 1 | Not your style |
| 😐 **Mid** | 2 | An average fit |
| 🔥 **Fire** | 3 | A great fit |
| 💜 **Tuff** | 4 | An outstanding fit |
| 👑 **Iconic** | 5 | A rare standout |

After rating, add a word such as **clean**, **cozy**, **bold**, or **timeless**. Iconic votes are limited according to recent rating activity; a lock means you need to rate more before using another one.

Open your own posts from **Profile** to review the rating distribution and comments. Scores come from the community. The AI generates style descriptions and similarity signals rather than assigning the five community ratings.

## Save inspiration and connect

- Use the save control on a post to add it to a collection. Find collections under **Profile → Collections**; the **+** control there creates a new collection.
- Visit a creator's profile and use **Follow** to bring their posts into your Following feed.
- Open a post to add a comment or browse its tags.
- Use interest controls on feed posts to help tune recommendations.
- Use the flag control to report a post or profile. Block accounts from their profiles, and manage them in **Settings → Blocked accounts**.
- Open **Settings** to edit your profile, choose a theme, view notifications, or replay the tutorial.

Profile visits, analytics, and collections are included for everyone in this free edition. There is no paid subscription or checkout.

## How the AI fits in

The standalone app always supports category/tag-based recommendations. With an optional server-side OpenAI key, it can inspect outfit photos to describe garments, colors, silhouettes, and overall style, and check for explicit imagery. Without a key, it uses clearly labeled tag-based style notes instead. Your community ratings remain separate from AI descriptions.

The recommendation vector is a deterministic representation of categories and tags. AI is optional and its descriptions can be inaccurate. See the [development guide](docs/development.md) for setup, data storage, optional AI, account recovery, and self-hosting.

## Build and run

```bash
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:3001**. The Node server serves the frontend and API together. To share an instance online, host it on a Node-capable service with persistent storage and HTTPS. The repository is not a live deployment.

## Checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Repository layout

| Path | Contents |
| --- | --- |
| `src/pages/` | Feed, discovery, upload, profiles, authentication, settings, and Pro screens |
| `src/components/` | Navigation, post cards, ratings, collections, and shared UI |
| `src/lib/` | Ranking, taste profiles, ratings, themes, and authentication helpers |
| `server/` | Authentication, persistent data, uploads, social actions, and optional AI |
| `scripts/` | One-command development startup and operator account recovery |
| `tests/` | Backend integration and permission tests |
| `public/` | Static app assets |
| `docs/` | Developer setup guidance |
| `archives/burger-ai-source.tar.gz` | Unmodified original uploaded source archive |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for a focused contribution workflow. No open-source license has been selected yet.
