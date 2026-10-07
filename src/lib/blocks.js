import { api } from "@/api/client";

// Users I blocked + users who blocked me — both directions hide content.
export async function getHiddenUserIds(meId) {
  try {
    const [iBlocked, blockedMe] = await Promise.all([
      api.entities.Block.filter({ blocker_id: meId }, "-created_date", 500),
      api.entities.Block.filter({ blocked_id: meId }, "-created_date", 500),
    ]);
    const set = new Set();
    iBlocked.forEach((b) => set.add(b.blocked_id));
    blockedMe.forEach((b) => set.add(b.blocker_id));
    return set;
  } catch (e) {
    return new Set();
  }
}

export async function blockUser(meId, targetId) {
  const existing = await api.entities.Block.filter({ blocker_id: meId, blocked_id: targetId }, "-created_date", 1);
  if (!existing.length) await api.entities.Block.create({ blocker_id: meId, blocked_id: targetId });
  // remove follow relationships both ways
  await api.entities.Follow.deleteMany({
    $or: [
      { follower_id: meId, following_id: targetId },
      { follower_id: targetId, following_id: meId },
    ],
  });
}

export async function unblockUser(meId, targetId) {
  await api.entities.Block.deleteMany({ blocker_id: meId, blocked_id: targetId });
}

export async function getBlockedIds(meId) {
  const list = await api.entities.Block.filter({ blocker_id: meId }, "-created_date", 500);
  return list.map((b) => b.blocked_id);
}