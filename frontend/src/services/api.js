import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/v1';

/**
 * Upload a PDF file for a given session.
 * @param {File} file
 * @param {string} sessionId  UUID identifying the user session
 * @returns {Promise<{session_id, filename, expires_at, chunks_ingested}>}
 */
export const uploadDocument = async (file, sessionId) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post(`${API_BASE}/upload_document`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-Session-ID': sessionId,
    },
  });
  return response.data;
};

/**
 * Ask a question against the session's uploaded document.
 * @param {string} query
 * @param {string} sessionId
 * @returns {Promise<{result: string, cached: boolean}>}
 */
export const queryDocument = async (query, sessionId) => {
  const response = await axios.get(`${API_BASE}/user_query`, {
    params: { query },
    headers: { 'X-Session-ID': sessionId },
  });
  return response.data;
};
