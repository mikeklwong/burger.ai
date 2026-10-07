# burger.ai

**Rate fits. Find your people.**

burger.ai is an AI-powered fashion social platform with an Instagram-style photo feed. Share your outfits, rate other people's fits, receive community feedback, and discover creators whose style matches yours.

This repository contains the React application, Base44 backend entities and functions, and the original source export. Running the platform requires a configured Base44 app; downloading the repository does not create a backend or deploy a live website.

## Get started on the platform

1. Register or sign in to the configured app.
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

The current app allows one post per day on the free plan and three on Pro. The upload screen shows your remaining allowance. AI description generation is optional: a post can still succeed if that step fails.

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

Pro screens include additional posting capacity, profile views, and analytics. Subscription features depend on the app's Stripe configuration.

## How the AI fits in

The backend uses Base44's LLM integration to describe garments, colors, silhouettes, and the overall style in an uploaded image. It also asks for a 32-number style representation used in similarity scoring. Feed ranking combines these signals with categories, tags, ratings, interests, and popularity. A separate AI function checks images for explicit content.

These are prototype features: generated descriptions and moderation results can be inaccurate, and the style representation is LLM-generated rather than a dedicated trained embedding model.

## Run the project

Prerequisites: Node.js compatible with Vite 8, npm, the Base44 CLI, Deno for the local backend, and access to a configured Base44 app.

```bash
git clone https://github.com/mikeklwong/burger.ai.git
cd burger.ai
npm install
npm install -g base44@latest
base44 login
base44 link
base44 dev
```

Open the frontend address printed by `base44 dev`. Each clone must be linked to its Base44 app. Core integrations and OAuth still depend on the hosted app, which must be published at least once.

See the [development guide](docs/development.md) for backend modes, configuration, checks, and publishing.

## Repository layout

| Path | Contents |
| --- | --- |
| `src/pages/` | Feed, discovery, upload, profiles, authentication, settings, and Pro screens |
| `src/components/` | Navigation, post cards, ratings, collections, and shared UI |
| `src/lib/` | Ranking, taste profiles, ratings, themes, and authentication helpers |
| `base44/entities/` | Schemas for posts, users, ratings, follows, collections, and more |
| `base44/functions/` | Posting, ratings, follows, AI descriptions, moderation, and Stripe handlers |
| `public/` | Static app assets |
| `docs/` | Developer setup guidance |
| `archives/burger-ai-source.tar.gz` | Unmodified original uploaded source archive |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for a focused contribution workflow. No open-source license has been selected yet.
