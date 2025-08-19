from http.server import BaseHTTPRequestHandler
import json
import os
from netsuite import NetSuite, Config, TokenAuth

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Get credentials from environment
            account_id = os.getenv("NETSUITE_ACCOUNT_ID")
            consumer_key = os.getenv("NETSUITE_CONSUMER_KEY") 
            consumer_secret = os.getenv("NETSUITE_CONSUMER_SECRET")
            token_id = os.getenv("NETSUITE_TOKEN_ID")
            token_secret = os.getenv("NETSUITE_TOKEN_SECRET")
            
            if not all([account_id, consumer_key, consumer_secret, token_id, token_secret]):
                response = {
                    "status": "error",
                    "error": "NetSuite credentials not configured",
                    "library": "netsuite-python"
                }
            else:
                # Test connection
                config = Config(
                    account=account_id,
                    auth=TokenAuth(
                        consumer_key=consumer_key,
                        consumer_secret=consumer_secret,
                        token_id=token_id,
                        token_secret=token_secret,
                    ),
                )
                
                netsuite = NetSuite(config)
                
                # Simple test - try to get account info
                response = {
                    "status": "success",
                    "message": "NetSuite authentication successful",
                    "library": "netsuite-python",
                    "account_id": account_id
                }
                
        except Exception as e:
            response = {
                "status": "error",
                "error": str(e),
                "library": "netsuite-python"
            }
        
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