import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Server-side enforcement of daily post limits.
// Free: 1/day, Pro: 3/day. Day resets at the user's local midnight
// (client sends `since` = ISO of their last local midnight).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { image_url, caption, category, tags, since } = body;
    if (!image_url || !category) {
      return Response.json({ error: 'image_url and category are required' }, { status: 400 });
    }

    const isPro = !!user.is_pro;
    const limit = isPro ? 3 : 1;

    const sinceDate = since ? new Date(since) : new Date();
    if (isNaN(sinceDate.getTime())) {
      return Response.json({ error: 'invalid since' }, { status: 400 });
    }

    // canonicalize tags so near-duplicates (#oldmoney vs #old-money) don't split data
    const normTag = (t) => String(t).toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanTags = [...new Set((tags || []).map(normTag).filter(Boolean))];

    // Count the user's posts created since their last local midnight.
    const recent = await base44.asServiceRole.entities.Post.filter(
      { author_id: user.id }, '-created_date', 50
    );
    const used = recent.filter((p) => new Date(p.created_date) >= sinceDate).length;

    if (used >= limit) {
      return Response.json(
        { error: 'limit_reached', limit, used, is_pro: isPro },
        { status: 429 }
      );
    }

    const post = await base44.asServiceRole.entities.Post.create({
      author_id: user.id,
      image_url,
      caption: (caption || '').slice(0, 300),
      category,
      tags: cleanTags,
      rating_burger: 0, rating_mid: 0, rating_fire: 0, rating_tuff: 0, rating_iconic: 0,
      rating_sum: 0, rating_count: 0, avg_score: 0, view_count: 0, top_word: null,
      is_boosted: isPro,
    });

    return Response.json({ post, used: used + 1, limit, is_pro: isPro });
  } catch (error) {
    console.error('createPost error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}