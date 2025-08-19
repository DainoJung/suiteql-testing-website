export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  
  if (req.method === 'GET') {
    // Get credentials from environment
    const account_id = process.env.NETSUITE_ACCOUNT_ID
    const consumer_key = process.env.NETSUITE_CONSUMER_KEY 
    const consumer_secret = process.env.NETSUITE_CONSUMER_SECRET
    const token_id = process.env.NETSUITE_TOKEN_ID
    const token_secret = process.env.NETSUITE_TOKEN_SECRET
    
    if (!account_id || !consumer_key || !consumer_secret || !token_id || !token_secret) {
      res.status(200).json({
        status: 'error',
        error: 'NetSuite credentials not configured',
        library: 'nextjs-api'
      })
    } else {
      // For now, just return success if credentials are configured
      // In a full implementation, this would test the actual connection
      res.status(200).json({
        status: 'success',
        message: 'NetSuite credentials are configured',
        library: 'nextjs-api',
        account_id: account_id
      })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}