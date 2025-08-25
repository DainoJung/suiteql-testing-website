import axios from 'axios';

// Create an axios instance with session management
const apiClient = axios.create();

// Add session ID to all requests
apiClient.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('suiteql_session_id');
  if (sessionId) {
    config.headers['X-Session-ID'] = sessionId;
  }
  return config;
});

// Handle session ID from responses
apiClient.interceptors.response.use(
  (response) => {
    // If server returns a new session ID, store it
    if (response.data?.sessionId) {
      localStorage.setItem('suiteql_session_id', response.data.sessionId);
    }
    return response;
  },
  (error) => {
    // Handle 401 errors by clearing session
    if (error.response?.status === 401) {
      localStorage.removeItem('suiteql_session_id');
    }
    return Promise.reject(error);
  }
);

export default apiClient;