from http.server import BaseHTTPRequestHandler
import json
import os

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
        
        # Check if NetSuite credentials are configured
        account_id = os.getenv("NETSUITE_ACCOUNT_ID")
        consumer_key = os.getenv("NETSUITE_CONSUMER_KEY") 
        consumer_secret = os.getenv("NETSUITE_CONSUMER_SECRET")
        token_id = os.getenv("NETSUITE_TOKEN_ID")
        token_secret = os.getenv("NETSUITE_TOKEN_SECRET")
        
        netsuite_configured = all([account_id, consumer_key, consumer_secret, token_id, token_secret])
        
        response = {
            "status": "healthy",
            "netsuite_configured": netsuite_configured,
            "library": "netsuite-python"
        }
        
        self.wfile.write(json.dumps(response).encode())
        return

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
        return