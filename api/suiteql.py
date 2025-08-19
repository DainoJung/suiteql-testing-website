from http.server import BaseHTTPRequestHandler
import json
import os
from netsuite import NetSuite, Config, TokenAuth

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Get credentials from environment
            account_id = os.getenv("NETSUITE_ACCOUNT_ID")
            consumer_key = os.getenv("NETSUITE_CONSUMER_KEY") 
            consumer_secret = os.getenv("NETSUITE_CONSUMER_SECRET")
            token_id = os.getenv("NETSUITE_TOKEN_ID")
            token_secret = os.getenv("NETSUITE_TOKEN_SECRET")
            
            if not all([account_id, consumer_key, consumer_secret, token_id, token_secret]):
                response = {
                    "success": False,
                    "error": "NetSuite credentials not configured"
                }
                self.send_response(500)
            else:
                # Parse request body
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                request_data = json.loads(post_data.decode())
                
                query = request_data.get('query', '').strip()
                if not query:
                    response = {
                        "success": False,
                        "error": "Query cannot be empty"
                    }
                    self.send_response(400)
                else:
                    # Execute SuiteQL
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
                    
                    # Execute the query
                    params = {"q": query}
                    endpoint = "/query/v1/suiteql"
                    headers = {"Prefer": "transient"}
                    
                    result = netsuite.rest_api.post(endpoint, json=params, headers=headers)
                    
                    response = {
                        "success": True,
                        "data": result,
                        "query": query,
                        "parameters": request_data.get('parameters')
                    }
                    self.send_response(200)
                
        except Exception as e:
            response = {
                "success": False,
                "error": str(e)
            }
            self.send_response(500)
        
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