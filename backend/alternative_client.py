"""
Alternative NetSuite client using RESTlet approach
"""
import requests
from requests_oauthlib import OAuth1
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class NetSuiteRESTletClient:
    def __init__(self, account_id, consumer_key, consumer_secret, token_id, token_secret, base_url):
        self.account_id = account_id
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self.token_id = token_id
        self.token_secret = token_secret
        self.base_url = base_url
        
        # Setup OAuth1 authentication for RESTlet
        self.auth = OAuth1(
            client_key=self.consumer_key,
            client_secret=self.consumer_secret,
            resource_owner_key=self.token_id,
            resource_owner_secret=self.token_secret,
            realm=self.account_id,
            signature_method="HMAC-SHA1"
        )
    
    def execute_suiteql_via_restlet(self, query: str) -> Dict[str, Any]:
        """Execute SuiteQL via RESTlet (alternative method)"""
        
        # RESTlet URL format
        # You would need to deploy a custom RESTlet script in NetSuite
        # This is a placeholder for the RESTlet URL format
        url = f"{self.base_url}/app/site/hosting/restlet.nl"
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        payload = {
            "query": query,
            "action": "suiteql"
        }
        
        try:
            logger.info(f"Trying RESTlet approach with URL: {url}")
            
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                auth=self.auth,
                timeout=30
            )
            
            logger.info(f"RESTlet response status: {response.status_code}")
            logger.info(f"RESTlet response: {response.text[:200]}...")
            
            return {
                "status_code": response.status_code,
                "response": response.text,
                "method": "restlet"
            }
            
        except Exception as e:
            logger.error(f"RESTlet error: {str(e)}")
            return {
                "error": str(e),
                "method": "restlet"
            }
    
    def test_basic_auth(self) -> Dict[str, Any]:
        """Test basic authentication with different endpoints"""
        
        endpoints_to_test = [
            # Different possible endpoint formats
            f"https://{self.account_id.replace('_', '-').lower()}.restlets.api.netsuite.com/app/site/hosting/restlet.nl",
            f"https://{self.account_id.replace('_', '-').lower()}.suitetalk.api.netsuite.com/services/rest/record/v1/metadata-catalog",
            f"{self.base_url}/app/site/hosting/restlet.nl",
        ]
        
        results = []
        
        for endpoint in endpoints_to_test:
            try:
                logger.info(f"Testing endpoint: {endpoint}")
                
                response = requests.get(
                    endpoint,
                    headers={"Accept": "application/json"},
                    auth=self.auth,
                    timeout=10
                )
                
                results.append({
                    "endpoint": endpoint,
                    "status_code": response.status_code,
                    "response": response.text[:200] if response.text else "No response"
                })
                
            except Exception as e:
                results.append({
                    "endpoint": endpoint,
                    "error": str(e)
                })
        
        return {"test_results": results}