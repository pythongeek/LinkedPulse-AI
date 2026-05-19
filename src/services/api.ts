import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

// Persona API
export const personaApi = {
  getAll: () => api.get('/persona'),
  getById: (id: string) => api.get(`/persona/${id}`),
  create: (data: any) => api.post('/persona', data),
  update: (id: string, data: any) => api.put(`/persona/${id}`, data),
  delete: (id: string) => api.delete(`/persona/${id}`),
  setDefault: (id: string) => api.post(`/persona/${id}/default`),
  getTemplates: () => api.get('/persona/templates'),
};

// Content API
export const contentApi = {
  generate: (data: any) => api.post('/content/generate', data),
  getAll: (params?: any) => api.get('/content', { params }),
  getById: (id: string) => api.get(`/content/${id}`),
  update: (id: string, data: any) => api.put(`/content/${id}`, data),
  delete: (id: string) => api.delete(`/content/${id}`),
  getSuggestions: (data: any) => api.post('/content/suggestions', data),
  publish: (id: string) => api.post(`/content/${id}/publish`),
};

// Job API
export const jobApi = {
  getStatus: (id: string) => api.get(`/cron/status/${id}`),
};

// Trend API
export const trendApi = {
  analyze: (data: any) => api.post('/trends/analyze', data),
  getTrending: () => api.get('/trends/trending'),
  getOpportunities: () => api.get('/trends/opportunities'),
  getOpportunityScore: (topic: string) => api.post('/trends/opportunity-score', { topic }),
};

// Competitor API
export const competitorApi = {
  analyze: (data: any) => api.post('/competitor/analyze', data),
  getGaps: (topic: string) => api.get(`/competitor/gaps/${topic}`),
  getTopPerformers: (topic: string) => api.get(`/competitor/top-performers/${topic}`),
};

// Audit API
export const auditApi = {
  run: (data: any) => api.post('/audit/run', data),
  getHistory: () => api.get('/audit/history'),
  getLatest: () => api.get('/audit/latest'),
  generateHeadlines: (data: any) => api.post('/audit/headlines', data),
};

// Image API
export const imageApi = {
  generate: (data: any) => api.post('/images/generate', data),
  generateCarousel: (data: any) => api.post('/images/carousel', data),
  generateBanner: (data: any) => api.post('/images/banner', data),
};

// User API
export const userApi = {
  getStats: () => api.get('/user/stats'),
  getAlerts: () => api.get('/user/alerts'),
  markAlertRead: (id: string) => api.put(`/user/alerts/${id}/read`),
  updateProfile: (data: any) => api.put('/user/profile', data),
};

// LinkedIn API
export const linkedinApi = {
  connect: (data: any) => api.post('/auth/linkedin', data),
  disconnect: (type?: 'cookie' | 'oauth') => api.delete('/auth/linkedin', { params: { type } }),
  getStatus: () => api.get('/auth/linkedin/status'),
  getOAuthUrl: () => api.get('/auth/linkedin/login'),
};
