import { RATINGS, normalizeTag } from "./ratings";

const EMBED_DIM = 32;

export function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function zeroEmbedding() { return new Array(EMBED_DIM).fill(0); }

export function emptyTasteProfile() {
  return { category_weights: {}, tag_weights: {}, taste_embedding: zeroEmbedding() };
}

// Update taste profile after a rating. ratingValue: burger|mid|fire|tuff
export function updateTasteProfile(profile, post, ratingValue) {
  const weights = { iconic: 4, tuff: 3, fire: 2, mid: 0, burger: -1 };
  const w = weights[ratingValue];
  if (w === undefined) return profile;

  const catW = { ...profile.category_weights };
  const tagW = { ...profile.tag_weights };

  if (post.category) catW[post.category] = (catW[post.category] || 0) + w;
  (post.tags || []).forEach((t) => { const nt = normalizeTag(t); if (nt) tagW[nt] = (tagW[nt] || 0) + w; });

  // pull/push embedding
  const emb = post.embedding && post.embedding.length === EMBED_DIM ? post.embedding : null;
  let taste = profile.taste_embedding && profile.taste_embedding.length === EMBED_DIM
    ? [...profile.taste_embedding] : zeroEmbedding();
  if (emb) {
    const pull = { iconic: 0.35, tuff: 0.25, fire: 0.12, mid: 0, burger: -0.06 }[ratingValue];
    if (pull) {
      for (let i = 0; i < EMBED_DIM; i++) {
        taste[i] = taste[i] + pull * (emb[i] - taste[i]);
      }
    }
  }
  return { category_weights: catW, tag_weights: tagW, taste_embedding: taste };
}

// Seed taste profile from onboarding picks
export function seedTasteProfile(categories, tags) {
  const catW = {};
  categories.forEach((c) => { catW[c] = (catW[c] || 0) + 2; });
  const tagW = {};
  tags.forEach((t) => { const nt = normalizeTag(t); if (nt) tagW[nt] = (tagW[nt] || 0) + 2; });
  return { category_weights: catW, tag_weights: tagW, taste_embedding: zeroEmbedding() };
}

// Similarity-based score from Interested / Not Interested signals.
// Interested posts push similar candidates up; not-interested pull them down.
function interestScore(post, interested, notInterested) {
  let score = 0;
  const postTags = new Set((post.tags || []).map(normalizeTag));
  const hasEmb = post.embedding && post.embedding.length === EMBED_DIM;
  for (const ip of interested) {
    if (ip.category === post.category) score += 0.12;
    const ipTags = new Set((ip.tags || []).map(normalizeTag));
    let overlap = 0; ipTags.forEach((t) => { if (postTags.has(t)) overlap++; });
    score += overlap * 0.08;
    if (hasEmb && ip.embedding && ip.embedding.length === EMBED_DIM) score += cosineSim(post.embedding, ip.embedding) * 0.15;
  }
  for (const np of notInterested) {
    if (np.category === post.category) score -= 0.18;
    const npTags = new Set((np.tags || []).map(normalizeTag));
    let overlap = 0; npTags.forEach((t) => { if (postTags.has(t)) overlap++; });
    score -= overlap * 0.12;
    if (hasEmb && np.embedding && np.embedding.length === EMBED_DIM) score -= cosineSim(post.embedding, np.embedding) * 0.2;
  }
  return score;
}

// Rank candidate posts for the For You feed
export function rankForYou(posts, tasteProfile, opts = {}) {
  const { seenIds = [], now = Date.now(), interests = {} } = opts;
  const interested = interests.interested || [];
  const notInterested = interests.notInterested || [];
  const candidates = posts.filter((p) => !seenIds.includes(p.id));

  const scored = candidates.map((p) => {
    const sim = cosineSim(tasteProfile.taste_embedding, p.embedding) * 0.5;
    let affinity = 0;
    const catW = tasteProfile.category_weights[p.category] || 0;
    affinity += catW;
    let tagAff = 0;
    (p.tags || []).forEach((t) => { tagAff += (tasteProfile.tag_weights[normalizeTag(t)] || 0); });
    if ((p.tags || []).length) tagAff = tagAff / (p.tags.length * 2);
    affinity = (affinity * 0.5 + tagAff * 0.5) * 0.2;

    const minRatings = 3;
    const quality = (p.rating_count >= minRatings ? p.avg_score / 5 : (p.avg_score / 5) * (p.rating_count / minRatings)) * 0.15;

    const ageDays = (now - new Date(p.created_date).getTime()) / 86400000;
    const freshness = Math.max(0, 1 - ageDays / 14) * 0.1;

    const random = Math.random() * 0.05;

    const iScore = interestScore(p, interested, notInterested);
    let score = sim + affinity + quality + freshness + random + iScore;
    if (p.is_boosted) score *= 1.3;
    return { post: p, score, iScore };
  });

  // drop candidates that strongly match a not-interested signal
  const eligible = scored.filter((s) => s.iScore > -0.35);
  eligible.sort((a, b) => b.score - a.score);

  // cap boosted at 1 in 4
  const result = [];
  let boostedInWindow = 0;
  let windowSize = 0;
  eligible.forEach((s) => {
    if (s.post.is_boosted) {
      if (windowSize >= 4 && boostedInWindow / windowSize >= 0.25) return;
      boostedInWindow++;
    }
    result.push(s.post);
    windowSize++;
    if (windowSize === 4) { windowSize = 0; boostedInWindow = 0; }
  });
  return result;
}

export function rankTrending(posts, now = Date.now()) {
  return posts
    .filter((p) => p.rating_count >= 5)
    .map((p) => {
      const ageHrs = (now - new Date(p.created_date).getTime()) / 3600000;
      const velocity = p.avg_score / Math.max(1, ageHrs / 24);
      return { post: p, score: velocity };
    })
    .sort((a, b) => b.score - a.score)
    .map((s) => s.post);
}