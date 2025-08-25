import credentialStore from '../../lib/credentialStore';
import { getSessionId, generateSessionId, isValidSessionId, setSecurityHeaders } from '../../lib/sessionUtils';

export default function handler(req, res) {
  // Set security headers
  setSecurityHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'GET') {
    // Get session ID from request
    const sessionId = getSessionId(req);
    
    // First check if there are runtime credentials for this session
    if (sessionId && credentialStore.has(sessionId)) {
      const status = credentialStore.getStatus(sessionId);
      res.status(200).json({
        ...status,
        source: 'session',
        sessionId: sessionId
      });
      return;
    }
    
    // Fall back to environment variables
    const account_id = process.env.NETSUITE_ACCOUNT_ID;
    const consumer_key = process.env.NETSUITE_CONSUMER_KEY;
    const consumer_secret = process.env.NETSUITE_CONSUMER_SECRET;
    const token_id = process.env.NETSUITE_TOKEN_ID;
    const token_secret = process.env.NETSUITE_TOKEN_SECRET;
    
    if (!account_id || !consumer_key || !consumer_secret || !token_id || !token_secret) {
      res.status(200).json({ 
        configured: false,
        source: 'none',
        sessionId: sessionId || null
      });
    } else {
      res.status(200).json({
        configured: true,
        source: 'environment',
        account_id: account_id,
        consumer_key: "••••••••",
        consumer_secret: "••••••••",
        token_id: "••••••••",
        token_secret: "••••••••"
      });
    }
  } else if (req.method === 'POST') {
    try {
      const credentials = req.body;
      
      // Validate input
      const required = ['account_id', 'consumer_key', 'consumer_secret', 'token_id', 'token_secret'];
      for (const field of required) {
        if (!credentials[field]) {
          res.status(400).json({ 
            error: `Missing required field: ${field}` 
          });
          return;
        }
      }
      
      // Get or generate session ID
      let sessionId = getSessionId(req);
      if (!sessionId) {
        sessionId = generateSessionId();
      }
      
      // Store credentials securely
      credentialStore.set(sessionId, credentials);
      
      res.status(200).json({ 
        success: true,
        message: "Configuration stored securely for this session",
        sessionId: sessionId,
        expiresIn: 4 * 60 * 60 * 1000 // 4 hours in milliseconds
      });
    } catch (error) {
      console.error('Error storing credentials:', error);
      res.status(500).json({ 
        error: 'Failed to store configuration' 
      });
    }
  } else if (req.method === 'DELETE') {
    // Allow users to clear their credentials
    const sessionId = getSessionId(req);
    if (sessionId) {
      credentialStore.delete(sessionId);
    }
    res.status(200).json({ 
      success: true,
      message: "Configuration cleared" 
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}