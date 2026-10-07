import { base44 } from "@/api/base44Client";

// Fetch users by ids in batches, return map id->user
export async function loadUsersByIds(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const map = {};
  // fetch in chunks of 50 using filter with id $in
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    try {
      const users = await base44.entities.User.filter({ id: { $in: chunk } }, "-created_date", 50);
      users.forEach((u) => { map[u.id] = u; });
    } catch (e) {}
  }
  return map;
}

export async function loadUser(id) {
  if (!id) return null;
  try {
    return await base44.entities.User.get(id);
  } catch (e) {
    const map = await loadUsersByIds([id]);
    return map[id] || null;
  }
}