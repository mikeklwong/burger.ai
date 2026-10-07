import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const SCORES = { burger: 1, mid: 2, fire: 3, tuff: 4, iconic: 5 };
const VALID_WORDS = new Set(["fit", "clean", "cozy", "bold", "classy", "edgy", "fresh", "minimal", "timeless", "trendy", "effortless", "statement", "sharp", "fun", "elegant", "street"]);

// Server-side rating with rate limiting, block enforcement, rare "iconic" cap,
// and one-word descriptor aggregation.
// Iconic is capped at ~1% of a user's weekly votes (min 1/week) to stay meaningful.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { post_id, value, word } = body;
    if (!post_id || !value) return Response.json({ error: 'post_id and value required' }, { status: 400 });
    if (!SCORES[value]) return Response.json({ error: 'invalid value' }, { status: 400 });
    const cleanWord = word && VALID_WORDS.has(word) ? word : null;

    const post = await base44.asServiceRole.entities.Post.get(post_id);
    if (!post) return Response.json({ error: 'post not found' }, { status: 404 });
    if (post.author_id === user.id) return Response.json({ error: 'cannot rate own post' }, { status: 400 });

    // block check (both directions)
    const blocks = await base44.asServiceRole.entities.Block.filter(
      { $or: [{ blocker_id: user.id, blocked_id: post.author_id }, { blocker_id: post.author_id, blocked_id: user.id }] },
      '-created_date', 1
    );
    if (blocks.length) return Response.json({ error: 'blocked' }, { status: 403 });

    // user's recent ratings (used for the 10-min rate limit + the weekly iconic cap)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime();
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).getTime();
    const recent = await base44.asServiceRole.entities.Rating.filter({ user_id: user.id }, '-created_date', 500);
    const inLast10 = recent.filter((r) => new Date(r.created_date).getTime() >= tenMinAgo).length;
    if (inLast10 >= 40) return Response.json({ error: 'rate_limited' }, { status: 429 });

    // iconic rarity cap: ~1% of weekly votes, min 1/week.
    // exclude this post's existing rating so re-affirming (e.g. adding a word) doesn't trip the cap.
    if (value === 'iconic') {
      const weekly = recent.filter((r) => new Date(r.created_date).getTime() >= weekAgo && r.post_id !== post_id);
      const iconicThisWeek = weekly.filter((r) => r.value === 'iconic').length;
      const allowed = Math.max(1, Math.floor(weekly.length * 0.01));
      if (iconicThisWeek >= allowed) {
        return Response.json({ error: 'iconic_locked', allowed, used: iconicThisWeek }, { status: 429 });
      }
    }

    // replace previous rating
    await base44.asServiceRole.entities.Rating.deleteMany({ user_id: user.id, post_id });
    const ratingData = { user_id: user.id, post_id, value, score: SCORES[value] };
    if (cleanWord) ratingData.word = cleanWord;
    await base44.asServiceRole.entities.Rating.create(ratingData);

    // recompute post counts + top word from all ratings on this post
    const all = await base44.asServiceRole.entities.Rating.filter({ post_id }, '-created_date', 1000);
    const counts = { burger: 0, mid: 0, fire: 0, tuff: 0, iconic: 0 };
    const wordTally = {};
    all.forEach((r) => {
      if (counts[r.value] !== undefined) counts[r.value]++;
      if (r.word) wordTally[r.word] = (wordTally[r.word] || 0) + 1;
    });
    const sum = counts.burger * 1 + counts.mid * 2 + counts.fire * 3 + counts.tuff * 4 + counts.iconic * 5;
    const count = counts.burger + counts.mid + counts.fire + counts.tuff + counts.iconic;
    let topWord = null;
    let topCount = 0;
    for (const [w, c] of Object.entries(wordTally)) {
      if (c > topCount) { topCount = c; topWord = w; }
    }
    await base44.asServiceRole.entities.Post.update(post_id, {
      rating_burger: counts.burger, rating_mid: counts.mid, rating_fire: counts.fire, rating_tuff: counts.tuff, rating_iconic: counts.iconic,
      rating_sum: sum, rating_count: count, avg_score: count ? sum / count : 0, top_word: topWord,
    });

    // notify author
    await base44.asServiceRole.entities.Notification.create({
      user_id: post.author_id, type: 'rating', actor_id: user.id, post_id, rating_value: value,
    });

    return Response.json({ value, word: cleanWord, counts, top_word: topWord, rating_count: count, avg_score: count ? sum / count : 0 });
  } catch (error) {
    console.error('ratePost error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}