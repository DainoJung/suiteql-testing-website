// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// API endpoints
export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/health`,
  config: `${API_BASE_URL}/api/config`,
  suiteql: `${API_BASE_URL}/api/suiteql`,
  testAuth: `${API_BASE_URL}/api/test-auth`,
  validateCredentials: `${API_BASE_URL}/api/validate-credentials`,
  debugAuth: `${API_BASE_URL}/api/debug-auth`,
  sampleQueries: `${API_BASE_URL}/api/sample-queries`
}