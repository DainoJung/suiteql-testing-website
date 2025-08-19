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
    // Check if NetSuite credentials are configured
    const netsuite_configured = !!(
      process.env.NETSUITE_ACCOUNT_ID &&
      process.env.NETSUITE_CONSUMER_KEY &&
      process.env.NETSUITE_CONSUMER_SECRET &&
      process.env.NETSUITE_TOKEN_ID &&
      process.env.NETSUITE_TOKEN_SECRET
    )
    
    res.status(200).json({
      status: 'healthy',
      netsuite_configured,
      library: 'nextjs-api'
    })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}