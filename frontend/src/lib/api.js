const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ev_token');
}

export function setToken(token) {
  localStorage.setItem('ev_token', token);
}

export function clearToken() {
  localStorage.removeItem('ev_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => request('/api/auth/me'),
  getOwners: () => request('/api/auth/owners'),
  register: (payload) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getVehicles: () => request('/api/vehicles'),
  registerVehicle: (payload) =>
    request('/api/vehicles', { method: 'POST', body: JSON.stringify(payload) }),
  getVehicle: (id) => request(`/api/vehicles/${id}`),
  getVehicleCurrent: (id) => request(`/api/vehicles/${id}/current`),
  getVehicleHistory: (id, hours = 6) => request(`/api/vehicles/${id}/history?hours=${hours}`),
  getAlerts: () => request('/api/alerts'),
  markAlertRead: (id) => request(`/api/alerts/${id}/read`, { method: 'POST' })
};
