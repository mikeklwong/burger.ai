import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

export const categories = ['Streetwear', 'Old Money', 'Business Casual', 'Formal', 'Historical'];
export const ratings = ['burger', 'mid', 'fire', 'tuff', 'iconic'];
export const entities = ['User', 'Post', 'Rating', 'Follow', 'PostInterest', 'Report', 'Block', 'UserTasteProfile', 'Collection', 'Notification', 'Comment', 'ProfileView', 'Subscription'];
export const now = () => new Date().toISOString();
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export function add(db, entity, data) {
  const record = { ...data, id: randomUUID(), created_date: now(), updated_date: now() };
  db[entity].push(record); return record;
}
export function matches(record, query = {}) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$or') return Array.isArray(value) && value.some(q => matches(record, q));
    if (value && typeof value === 'object') {
      if ('$in' in value) return Array.isArray(value.$in) && value.$in.includes(record[key]);
      return false;
    }
    return record[key] === value;
  });
}
export function publicUser(user, own = false) {
  const { password_hash, salt, email, ...rest } = user;
  return own ? { ...rest, email } : rest;
}
export function styleVector(category, tags = []) {
  const vector = Array(32).fill(0);
  for (const word of [category, ...tags]) {
    const hash = createHash('sha256').update(String(word).toLowerCase()).digest();
    vector[hash[0] % 32] += hash[1] % 2 ? 1 : -1;
  }
  const norm = Math.hypot(...vector) || 1;
  return vector.map(x => x / norm);
}
function seed() {
  const db = Object.fromEntries(entities.map(name => [name, []])); db.sessions = [];
  for (const [index, category] of categories.slice(0, 3).entries()) {
    const author = add(db, 'User', { username: `style_sample_${index + 1}`, display_name: 'Sample collection', bio: 'Illustrated demo outfits. Not a real account.', is_pro: true, onboarding_complete: true, is_sample: true, favorite_categories: [category], followed_tags: [] });
    add(db, 'Post', { author_id: author.id, image_url: `/samples/outfit-${index + 1}.svg`, caption: 'Sample outfit illustration. Upload your own photo to join the feed.', category, tags: ['sample', 'inspiration'], style_description: `${category} inspiration · illustrated sample`, description_source: 'sample', embedding: styleVector(category, ['sample']), ...Object.fromEntries(ratings.map(r => [`rating_${r}`, 0])), rating_count: 0, rating_sum: 0, avg_score: 0, view_count: 0, is_boosted: false });
  }
  return db;
}
export async function createStore(directory) {
  await mkdir(directory, { recursive: true }); await mkdir(join(directory, 'uploads'), { recursive: true });
  const path = join(directory, 'database.json'); let db;
  try { db = JSON.parse(await readFile(path, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; db = seed(); }
  let queue = Promise.resolve();
  async function save() { await writeFile(`${path}.tmp`, JSON.stringify(db), { mode: 0o600 }); await rename(`${path}.tmp`, path); }
  await save();
  return {
    directory,
    run(action) {
      const next = queue.then(async () => {
        const before = structuredClone(db);
        try { const result = await action(db); await save(); return result; }
        catch (error) { db = before; throw error; }
      });
      queue = next.catch(() => {}); return next;
    },
  };
}
