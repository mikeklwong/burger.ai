/** @typedef {Record<string, any>} RecordData */
/** @param {string} path @param {RequestInit} [options] @returns {Promise<any>} */
async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, { credentials: 'same-origin', ...options });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: response.status });
  return data;
}
const write = (path, data, method = 'POST') => request(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
/** @param {string} name */
function entity(name) {
  const path = `/entities/${name}`;
  return {
    /** @param {RecordData} query @param {string} [sort] @param {number} [limit] @returns {Promise<RecordData[]>} */
    filter: (query = {}, sort = '-created_date', limit = 100) => request(`${path}?${new URLSearchParams({ filter: JSON.stringify(query), sort, limit: String(limit) })}`),
    /** @param {string} [sort] @param {number} [limit] @returns {Promise<RecordData[]>} */
    list: (sort = '-created_date', limit = 100) => request(`${path}?${new URLSearchParams({ sort, limit: String(limit) })}`),
    /** @param {string} id @returns {Promise<RecordData>} */
    get: id => request(`${path}/${encodeURIComponent(id)}`),
    /** @param {RecordData} data @returns {Promise<RecordData>} */
    create: data => write(path, data),
    /** @param {string} id @param {RecordData} data @returns {Promise<RecordData>} */
    update: (id, data) => write(`${path}/${encodeURIComponent(id)}`, data, 'PATCH'),
    delete: id => write(`${path}/${encodeURIComponent(id)}`, {}, 'DELETE'),
    deleteMany: filter => write(path, { filter }, 'DELETE'),
  };
}
const names = ['User', 'Post', 'Rating', 'Follow', 'PostInterest', 'Report', 'Block', 'UserTasteProfile', 'Collection', 'Notification', 'Comment', 'ProfileView', 'Subscription'];
export const api = {
  entities: Object.fromEntries(names.map(name => [name, entity(name)])),
  app: { getPublicSettings: () => request('/settings') },
  auth: {
    me: () => request('/auth/me'),
    updateMe: data => write('/auth/me', data, 'PATCH'),
    loginViaEmailPassword: (email, password) => write('/auth/login', { email, password }),
    register: data => write('/auth/register', data),
    demo: () => write('/auth/demo', {}),
    logout: () => write('/auth/logout', {}),
    deleteAccount: () => write('/auth/account', {}, 'DELETE'),
  },
  functions: { invoke: async (name, data) => ({ data: await write(`/functions/${name}`, data) }) },
  integrations: { Core: {
    /** @param {{file: File}} options @returns {Promise<{file_url: string}>} */
    UploadPublicFile: ({ file }) => request('/upload', { method: 'POST', headers: { 'Content-Type': file.type }, body: file }),
  } },
};
