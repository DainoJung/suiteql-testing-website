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
    // Check current NetSuite configuration status (masked for security)
    const account_id = process.env.NETSUITE_ACCOUNT_ID
    const consumer_key = process.env.NETSUITE_CONSUMER_KEY 
    const consumer_secret = process.env.NETSUITE_CONSUMER_SECRET
    const token_id = process.env.NETSUITE_TOKEN_ID
    const token_secret = process.env.NETSUITE_TOKEN_SECRET
    
    if (!account_id || !consumer_key || !consumer_secret || !token_id || !token_secret) {
      res.status(200).json({ configured: false })
    } else {
      res.status(200).json({
        configured: true,
        account_id: account_id,
        consumer_key: consumer_key ? "••••••••" : "",
        consumer_secret: consumer_secret ? "••••••••" : "",
        token_id: token_id ? "••••••••" : "",
        token_secret: token_secret ? "••••••••" : ""
      })
    }
  } else if (req.method === 'POST') {
    // For now, return success - in production, this would update environment variables
    res.status(200).json({ 
      message: "Configuration received - please set environment variables in Vercel dashboard" 
    })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}