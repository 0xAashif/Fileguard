import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

// Attach JWT token automatically to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fg_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Calculates SHA-256 hash in the browser using Web Crypto API.
 * The file NEVER leaves the user's device.
 */
export async function calculateHashLocally(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// ── Auth APIs ──
export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  if (response.data?.token) {
    localStorage.setItem('fg_token', response.data.token);
    localStorage.setItem('fg_user', JSON.stringify(response.data));
  }
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  if (response.data?.token) {
    localStorage.setItem('fg_token', response.data.token);
    localStorage.setItem('fg_user', JSON.stringify(response.data));
  }
  return response.data;
};

export const logoutUser = () => {
  localStorage.removeItem('fg_token');
  localStorage.removeItem('fg_user');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('fg_user');
  return user ? JSON.parse(user) : null;
};

// ── Document APIs ──
export const uploadFile = async (file, onProgress) => {
  if (onProgress) onProgress({ status: 'hashing' });
  const hash = await calculateHashLocally(file);

  if (onProgress) onProgress({ status: 'anchoring' });
  const response = await api.post('/documents/anchor', {
    hash,
    fileName: file.name,
    fileSizeBytes: file.size,
  });
  return response.data;
};

export const verifyByFile = async (file) => {
  const hash = await calculateHashLocally(file);
  return verifyByHash(hash);
};

export const verifyByHash = async (hash) => {
  const response = await api.post('/documents/verify', { hash });
  return response.data;
};

export const getDocuments = async (page = 1, limit = 20) => {
  const response = await api.get(`/documents?page=${page}&limit=${limit}`);
  return response.data;
};

export const getDocument = async (id) => {
  const response = await api.get(`/documents/${id}`);
  return response.data;
};

export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};
