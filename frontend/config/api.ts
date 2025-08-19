// API Configuration
const isDevelopment = process.env.NODE_ENV === 'development'
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8000' 
  : (process.env.NEXT_PUBLIC_API_URL || 'https://suiteql-testing-website.vercel.app')

// API endpoints
export const API_ENDPOINTS = {
  health: isDevelopment ? `${API_BASE_URL}/health` : `${API_BASE_URL}/api/health`,
  config: isDevelopment ? `${API_BASE_URL}/api/config` : `${API_BASE_URL}/api/config`, 
  suiteql: isDevelopment ? `${API_BASE_URL}/api/suiteql` : `${API_BASE_URL}/api/suiteql`,
  testAuth: isDevelopment ? `${API_BASE_URL}/api/test-auth` : `${API_BASE_URL}/api/test-auth`,
  validateCredentials: isDevelopment ? `${API_BASE_URL}/api/validate-credentials` : `${API_BASE_URL}/api/validate-credentials`,
  debugAuth: isDevelopment ? `${API_BASE_URL}/api/debug-auth` : `${API_BASE_URL}/api/debug-auth`,
  sampleQueries: isDevelopment ? `${API_BASE_URL}/api/sample-queries` : `${API_BASE_URL}/api/sample-queries`
}