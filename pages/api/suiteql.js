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
  
  if (req.method === 'POST') {
    try {
      const { query, limit = 1000, offset = 0 } = req.body;
      
      if (!query) {
        res.status(400).json({
          success: false,
          error: 'Query is required'
        });
        return;
      }
      
      // Get session ID from request
      const sessionId = getSessionId(req);
      let credentials = null;
      
      // First try to get credentials from session
      if (sessionId) {
        credentials = credentialStore.get(sessionId);
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
        }
      }
      
      if (!credentials) {
        res.status(401).json({
          success: false,
          error: 'NetSuite credentials not configured. Please configure your NetSuite connection first.'
        });
        return;
      }
      
      // Prepare the API request
      const url = `https://${credentials.account_id}.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql`;
      
      // Add limit and offset to query if not already present
      let finalQuery = query.trim();
      if (!finalQuery.toLowerCase().includes('limit') && !finalQuery.toLowerCase().includes('fetch')) {
        finalQuery += ` LIMIT ${limit} OFFSET ${offset}`;
      }
      
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
      
      // Make the request to NetSuite
      const response = await axios.post(
        url,
        { q: finalQuery },
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'prefer': 'transient'
          },
          timeout: 30000 // 30 seconds timeout
        }
      );
      
      // Process the response
      const data = response.data;
      
      res.status(200).json({
        success: true,
        data: {
          items: data.items || [],
          count: data.totalResults || (data.items ? data.items.length : 0),
          hasMore: data.hasMore || false,
          offset: data.offset || offset,
          links: data.links || []
        },
        query: finalQuery,
        parameters: {
          limit,
          offset
        }
      });
      
    } catch (error) {
      console.error('SuiteQL query failed:', error);
      
      let errorMessage = 'Failed to execute query';
      let errorType = 'execution';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 400) {
          errorType = 'syntax';
          errorMessage = data?.title || 'Query syntax error';
        } else if (status === 401) {
          errorType = 'authentication';
          errorMessage = 'Authentication failed. Please check your credentials.';
        } else if (status === 403) {
          errorType = 'permission';
          errorMessage = 'Permission denied. Please check your NetSuite permissions.';
        } else {
          errorMessage = data?.title || data?.detail || errorMessage;
        }
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        errorType = 'network';
        errorMessage = 'Network connection failed';
      }
      
      res.status(200).json({
        success: false,
        error: errorMessage,
        errorType: errorType,
        details: error.response?.data || error.message,
        query: req.body.query
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}