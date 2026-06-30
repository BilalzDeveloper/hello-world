export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, opts = {}) {
  const { json, ...rest } = opts;
  const init = { credentials: 'same-origin', ...rest };
  if (json !== undefined) {
    init.method = init.method || 'POST';
    init.headers = { 'Content-Type': 'application/json', ...(init.headers || {}) };
    init.body = JSON.stringify(json);
  }
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `HTTP ${res.status}`, res.status);
  return data;
}

export const api = {
  login: (password) => request('/api/login', { method: 'POST', json: { password } }),
  logout: () => request('/api/logout', { method: 'POST' }),
  getConfig: () => request('/api/config'),
  getReview: (vendor) => request(`/api/review${vendor ? `?vendor=${encodeURIComponent(vendor)}` : ''}`),
  patchReview: (id, body) => request(`/api/review/${id}`, { method: 'PATCH', json: body }),
  publish: (ids) => request('/api/publish', { method: 'POST', json: { ids } }),
  getUnmappedChats: () => request('/api/chats/unmapped'),
  mapChat: (chatId, vendor) => request('/api/chats/map', { method: 'POST', json: { chatId, vendor } }),
  getCollectionRules: () => request('/api/collection-rules'),
  putCollectionRules: (rules) => request('/api/collection-rules', { method: 'PUT', json: { rules } }),
  mergeReview: (ids, keepId) => request('/api/review/merge', { method: 'POST', json: { ids, keepId } }),
  splitReview: (id, hashes) => request(`/api/review/${id}/split`, { method: 'POST', json: { hashes } }),
  approveBulk: (ids) => request('/api/review/approve-bulk', { method: 'POST', json: { ids } }),
  getAiUsage: () => request('/api/ai-usage'),
};
