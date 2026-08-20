/**
 * @file lib/api.js
 * @description API client for communicating with the FileGuard Express backend.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000, // 60s timeout (large file uploads can take time)
});

/**
 * Upload a file for SHA-256 hashing and blockchain anchoring.
 * @param {File} file - File object from input or drag-and-drop
 * @returns {Promise<object>} Upload result with hash, timestamp, etc.
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * Verify a document by re-uploading the file.
 * @param {File} file - File to verify
 * @returns {Promise<object>} Verification result
 */
export async function verifyByFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post('/documents/verify/file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * Verify a document by its SHA-256 hash.
 * @param {string} hash - 64-character hex hash
 * @returns {Promise<object>} Verification result
 */
export async function verifyByHash(hash) {
  const { data } = await api.post('/documents/verify/hash', { hash });
  return data;
}

/**
 * Fetch all anchored documents.
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<object>} Documents list with pagination
 */
export async function getDocuments(page = 1, limit = 20) {
  const { data } = await api.get('/documents', { params: { page, limit } });
  return data;
}

/**
 * Get a single document by ID.
 * @param {string} id - Document ID
 * @returns {Promise<object>} Document details
 */
export async function getDocument(id) {
  const { data } = await api.get(`/documents/${id}`);
  return data;
}

/**
 * Check server health.
 * @returns {Promise<object>} Server status
 */
export async function getHealth() {
  const { data } = await api.get('/health');
  return data;
}
