from http.server import BaseHTTPRequestHandler
import json
import os

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Check current NetSuite configuration status (masked for security)
        account_id = os.getenv("NETSUITE_ACCOUNT_ID")
        consumer_key = os.getenv("NETSUITE_CONSUMER_KEY") 
        consumer_secret = os.getenv("NETSUITE_CONSUMER_SECRET")
        token_id = os.getenv("NETSUITE_TOKEN_ID")
        token_secret = os.getenv("NETSUITE_TOKEN_SECRET")
        
        if not all([account_id, consumer_key, consumer_secret, token_id, token_secret]):
            response = {"configured": False}
        else:
            response = {
                "configured": True,
                "account_id": account_id,
                "consumer_key": "••••••••" if consumer_key else "",
                "consumer_secret": "••••••••" if consumer_secret else "",
                "token_id": "••••••••" if token_id else "",
                "token_secret": "••••••••" if token_secret else ""
            }
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
        
        self.wfile.write(json.dumps(response).encode())
        return

    def do_POST(self):
        # For now, return success - in production, this would update environment variables
        response = {"message": "Configuration received - please set environment variables in Vercel dashboard"}
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
        
        self.wfile.write(json.dumps(response).encode())
        return

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
        return