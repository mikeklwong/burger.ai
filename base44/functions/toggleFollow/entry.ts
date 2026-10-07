import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Server-side follow toggle with rate limiting + block enforcement.
// Limit: 50 new follows per hour per user.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { target_id } = body;
    if (!target_id) return Response.json({ error: 'target_id required' }, { status: 400 });
    if (target_id === user.id) return Response.json({ error: 'cannot follow self' }, { status: 400 });

    // block check (both directions)
    const blocks = await base44.asServiceRole.entities.Block.filter(
      { $or: [{ blocker_id: user.id, blocked_id: target_id }, { blocker_id: target_id, blocked_id: user.id }] },
      '-created_date', 1
    );
    if (blocks.length) return Response.json({ error: 'blocked' }, { status: 403 });

    const existing = await base44.asServiceRole.entities.Follow.filter(
      { follower_id: user.id, following_id: target_id }, '-created_date', 1
    );
    if (existing.length) {
      await base44.asServiceRole.entities.Follow.deleteMany({ follower_id: user.id, following_id: target_id });
      return Response.json({ following: false });
    }

    // rate limit on new follows: follows in the last hour
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await base44.asServiceRole.entities.Follow.filter({ follower_id: user.id }, '-created_date', 100);
    const recentCount = recent.filter((f) => new Date(f.created_date) >= since).length;
    if (recentCount >= 50) return Response.json({ error: 'rate_limited' }, { status: 429 });

    await base44.asServiceRole.entities.Follow.create({ follower_id: user.id, following_id: target_id });
    await base44.asServiceRole.entities.Notification.create({
      user_id: target_id, type: 'follow', actor_id: user.id,
    });
    return Response.json({ following: true });
  } catch (error) {
    console.error('toggleFollow error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}