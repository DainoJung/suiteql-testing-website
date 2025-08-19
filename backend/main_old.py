from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from typing import Dict, Any, Optional
import json
import logging
from netsuite import NetSuite, Config, TokenAuth

# Load environment variables
load_dotenv(dotenv_path="../.env")
# Also try loading from current directory if parent doesn't exist
if not os.path.exists("../.env"):
    load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SuiteQL API", description="NetSuite SuiteQL Query Interface")

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SuiteQLRequest(BaseModel):
    query: str
    parameters: Optional[Dict[str, Any]] = None

class NetSuiteClient:
    def __init__(self):
        self.account_id = os.getenv("NETSUITE_ACCOUNT_ID")
        self.consumer_key = os.getenv("NETSUITE_CONSUMER_KEY")
        self.consumer_secret = os.getenv("NETSUITE_CONSUMER_SECRET")
        self.token_id = os.getenv("NETSUITE_TOKEN_ID")
        self.token_secret = os.getenv("NETSUITE_TOKEN_SECRET")
        
        if not all([self.account_id, self.consumer_key, self.consumer_secret, 
                   self.token_id, self.token_secret]):
            raise ValueError("Missing required NetSuite configuration")
        
        # NetSuite 클라이언트 초기화 (netsuite 라이브러리 사용)
        config = Config(
            account=self.account_id,
            auth=TokenAuth(
                consumer_key=self.consumer_key,
                consumer_secret=self.consumer_secret,
                token_id=self.token_id,
                token_secret=self.token_secret,
            ),
        )
        
        self.netsuite = NetSuite(config)
        logger.info("NetSuite 클라이언트가 성공적으로 초기화되었습니다.")
    
    def execute_suiteql(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute SuiteQL query against NetSuite"""
        
        # Prepare the request payload
        payload = {
            "q": query
        }
        
        if parameters:
            payload["params"] = parameters
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "SuiteQL-Client/1.0"
        }
        
        # Try different URL formats for SuiteQL
        # Format 1: Direct account-based URL
        account_id_clean = self.account_id.replace('_', '-').lower()
        url = f"https://{account_id_clean}.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql"
        
        try:
            logger.info(f"Executing SuiteQL query: {query[:100]}...")
            logger.info(f"Using URL: {url}")
            logger.info(f"Account ID: {self.account_id}")
            
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                auth=self.auth,
                timeout=30
            )
            
            logger.info(f"NetSuite response status: {response.status_code}")
            
            if response.status_code == 200:
                return response.json()
            else:
                error_detail = response.text
                logger.error(f"NetSuite API error (Status {response.status_code}): {error_detail}")
                
                # More specific error handling
                if response.status_code == 401:
                    raise HTTPException(
                        status_code=401,
                        detail="Authentication failed. Please check your NetSuite credentials."
                    )
                elif response.status_code == 403:
                    raise HTTPException(
                        status_code=403,
                        detail="Access denied. Please check your NetSuite permissions for SuiteQL."
                    )
                else:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"NetSuite API error: {error_detail}"
                    )
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Connection error: {str(e)}"
            )

# Initialize NetSuite client
try:
    netsuite_client = NetSuiteClient()
except ValueError as e:
    logger.error(f"NetSuite client initialization error: {e}")
    netsuite_client = None

@app.get("/")
async def root():
    return {"message": "SuiteQL API is running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "netsuite_configured": netsuite_client is not None
    }

@app.post("/api/suiteql")
async def execute_suiteql(request: SuiteQLRequest):
    """Execute SuiteQL query"""
    
    if not netsuite_client:
        raise HTTPException(
            status_code=500,
            detail="NetSuite client not configured"
        )
    
    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Query cannot be empty"
        )
    
    try:
        result = netsuite_client.execute_suiteql(
            query=request.query,
            parameters=request.parameters
        )
        
        return {
            "success": True,
            "data": result,
            "query": request.query,
            "parameters": request.parameters
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

@app.get("/api/test-auth")
async def test_auth():
    """Test NetSuite authentication"""
    if not netsuite_client:
        raise HTTPException(status_code=500, detail="NetSuite client not configured")
    
    try:
        # Try a simple REST API call to test authentication
        base_domain = netsuite_client.base_url.replace("restlets.api.netsuite.com", "suitetalk.api.netsuite.com")
        url = f"{base_domain}/services/rest/record/v1/metadata-catalog"
        
        headers = {
            "Accept": "application/json"
        }
        
        response = requests.get(
            url,
            headers=headers,
            auth=netsuite_client.auth,
            timeout=30
        )
        
        return {
            "status_code": response.status_code,
            "response": response.text[:500] if response.text else "No response body",
            "auth_test": "completed"
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "auth_test": "failed"
        }

@app.get("/api/sample-queries")
async def get_sample_queries():
    """Get sample SuiteQL queries"""
    return {
        "queries": [
            {
                "name": "Customer List",
                "query": "SELECT id, entityid, companyname FROM customer LIMIT 10",
                "description": "Retrieve a list of customers"
            },
            {
                "name": "Item Inventory",
                "query": "SELECT itemid, displayname, quantityavailable FROM item WHERE quantityavailable > 0 LIMIT 10",
                "description": "Items with available inventory"
            },
            {
                "name": "Recent Transactions",
                "query": "SELECT id, tranid, type, trandate, entity FROM transaction WHERE trandate >= '2024-01-01' ORDER BY trandate DESC LIMIT 10",
                "description": "Recent transactions"
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)