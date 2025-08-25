import credentialStore from '../../lib/credentialStore';
import { getSessionId, setSecurityHeaders } from '../../lib/sessionUtils';
import crypto from 'crypto';
import axios from 'axios';

// Generate OAuth 1.0a signature
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  // Sort parameters alphabetically
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  // Create signature base string
  const signatureBase = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  
  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  // Generate signature
  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(signatureBase)
    .digest('base64');
  
  return signature;
}

export default async function handler(req, res) {
  // Set security headers
  setSecurityHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'GET' || req.method === 'POST') {
    try {
      // Get session ID from request
      const sessionId = getSessionId(req);
      console.log('Test-auth received sessionId:', sessionId);
      console.log('Request headers:', req.headers);
      
      let credentials = null;
      let source = 'none';
      
      // First try to get credentials from session
      if (sessionId) {
        console.log('Checking credential store for sessionId:', sessionId);
        credentials = credentialStore.get(sessionId);
        if (credentials) {
          source = 'session';
          console.log('Found credentials in session store');
        } else {
          console.log('No credentials found in session store');
        }
      }
      
      // Fall back to environment variables
      if (!credentials) {
        const account_id = process.env.NETSUITE_ACCOUNT_ID;
        const consumer_key = process.env.NETSUITE_CONSUMER_KEY;
        const consumer_secret = process.env.NETSUITE_CONSUMER_SECRET;
        const token_id = process.env.NETSUITE_TOKEN_ID;
        const token_secret = process.env.NETSUITE_TOKEN_SECRET;
        
        if (account_id && consumer_key && consumer_secret && token_id && token_secret) {
          credentials = {
            account_id,
            consumer_key,
            consumer_secret,
            token_id,
            token_secret
          };
          source = 'environment';
        }
      }
      
      if (!credentials) {
        res.status(200).json({
          status: 'error',
          error: 'NetSuite credentials not configured',
          source: source,
          library: 'nextjs-api'
        });
        return;
      }
      
      // Test the connection with a simple SuiteQL query
      const testQuery = "SELECT id FROM employee WHERE ROWNUM <= 1";
      const url = `https://${credentials.account_id}.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql`;
      
      // OAuth 1.0a parameters
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomBytes(16).toString('hex');
      
      const oauthParams = {
        oauth_consumer_key: credentials.consumer_key,
        oauth_nonce: nonce,
        oauth_signature_method: 'HMAC-SHA256',
        oauth_timestamp: timestamp,
        oauth_token: credentials.token_id,
        oauth_version: '1.0'
      };
      
      // Generate signature
      const signature = generateOAuthSignature(
        'POST',
        url,
        oauthParams,
        credentials.consumer_secret,
        credentials.token_secret
      );
      
      // Create Authorization header
      const authHeader = 'OAuth ' + Object.keys(oauthParams)
        .sort()
        .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
        .concat(`oauth_signature="${encodeURIComponent(signature)}"`)
        .join(', ');
      
      // Make test request
      const response = await axios.post(
        url,
        { q: testQuery },
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'prefer': 'transient'
          },
          timeout: 10000
        }
      );
      
      res.status(200).json({
        status: 'success',
        message: 'NetSuite connection successful',
        library: 'nextjs-api',
        source: source,
        account_id: credentials.account_id
      });
      
    } catch (error) {
      console.error('NetSuite connection test failed:', error);
      
      let errorMessage = 'Failed to connect to NetSuite';
      if (error.response) {
        errorMessage = error.response.data?.title || error.response.data?.detail || errorMessage;
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        errorMessage = 'Network connection failed';
      }
      
      res.status(200).json({
        status: 'error',
        error: errorMessage,
        library: 'nextjs-api',
        details: error.response?.data || error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}