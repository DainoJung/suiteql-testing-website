// Session management utilities
import crypto from 'crypto';

// Generate a secure session ID
export function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

// Get or create session ID from request
export function getSessionId(req) {
  // Try to get from Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try to get from custom header
  const sessionHeader = req.headers['x-session-id'];
  if (sessionHeader) {
    return sessionHeader;
  }
  
  // Try to get from query parameter (less secure, but convenient for testing)
  if (req.query && req.query.sessionId) {
    return req.query.sessionId;
  }
  
  return null;
}

// Validate session ID format
export function isValidSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  
  // Check if it's a valid hex string of correct length (64 chars = 32 bytes)
  return /^[a-f0-9]{64}$/i.test(sessionId);
}

// Set secure headers
export function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // CORS headers for API
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-ID');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}