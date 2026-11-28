/**
 * SocialIQ Frontend API Client
 * Handles authentication headers, error normalization, and endpoints for Auth, Posts, and CSV Upload.
 */

const API_BASE = '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('socialiq_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

// Authentication Services
export const authService = {
  register: async (name, email, password) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    return handleResponse(res);
  },

  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// Posts CRUD Services
export const postService = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.platform && params.platform !== 'All') query.append('platform', params.platform);
    if (params.contentType && params.contentType !== 'All') query.append('contentType', params.contentType);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.sort) query.append('sort', params.sort);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/posts${qs}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getById: async (id) => {
    const res = await fetch(`${API_BASE}/posts/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (postData) => {
    const res = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(postData),
    });
    return handleResponse(res);
  },

  update: async (id, postData) => {
    const res = await fetch(`${API_BASE}/posts/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(postData),
    });
    return handleResponse(res);
  },

  delete: async (id) => {
    const res = await fetch(`${API_BASE}/posts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// Analytics Services
export const analyticsService = {
  getAnalytics: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.platform && params.platform !== 'All') query.append('platform', params.platform);
    if (params.contentType && params.contentType !== 'All') query.append('contentType', params.contentType);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/analytics${qs}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getInsights: async () => {
    const res = await fetch(`${API_BASE}/analytics/insights`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  compare: async ({ type, a, b } = {}) => {
    const query = new URLSearchParams();
    if (type) query.append('type', type);
    if (a) query.append('a', a);
    if (b) query.append('b', b);
    const res = await fetch(`${API_BASE}/analytics/compare?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// ML Prediction Services (Node proxies to the Flask ML service)
export const predictionService = {
  predict: async (features) => {
    const res = await fetch(`${API_BASE}/prediction`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(features),
    });
    return handleResponse(res);
  },
};

// CSV Upload Services
export const uploadService = {
  uploadCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('socialiq_token');
    const res = await fetch(`${API_BASE}/upload/csv`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    return handleResponse(res);
  },
};
