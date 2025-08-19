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

class NetSuiteConfigRequest(BaseModel):
    account_id: str
    consumer_key: str
    consumer_secret: str
    token_id: str
    token_secret: str

class NetSuiteClient:
    def __init__(self, account_id=None, consumer_key=None, consumer_secret=None, 
                 token_id=None, token_secret=None):
        # Read from environment variables or parameters
        self.account_id = account_id or os.getenv("NETSUITE_ACCOUNT_ID")
        self.consumer_key = consumer_key or os.getenv("NETSUITE_CONSUMER_KEY")
        self.consumer_secret = consumer_secret or os.getenv("NETSUITE_CONSUMER_SECRET")
        self.token_id = token_id or os.getenv("NETSUITE_TOKEN_ID")
        self.token_secret = token_secret or os.getenv("NETSUITE_TOKEN_SECRET")
        
        if not all([self.account_id, self.consumer_key, self.consumer_secret, 
                   self.token_id, self.token_secret]):
            raise ValueError("Missing required NetSuite configuration")
        
        # Initialize NetSuite client (using netsuite library)
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
        logger.info("NetSuite client initialized successfully.")
    
    def update_config(self, account_id: str, consumer_key: str, consumer_secret: str,
                     token_id: str, token_secret: str):
        """Update NetSuite configuration at runtime"""
        self.account_id = account_id
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self.token_id = token_id
        self.token_secret = token_secret
        
        # Recreate client with new configuration
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
        logger.info("NetSuite client configuration updated successfully.")
    
    async def execute_suiteql(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute SuiteQL query against NetSuite using netsuite library"""
        
        try:
            logger.info(f"Executing SuiteQL query: {query[:100]}...")
            logger.info(f"Account ID: {self.account_id}")
            
            # Prepare SuiteQL query parameters
            params = {"q": query}
            if parameters:
                params["params"] = parameters
            
            # SuiteQL call using netsuite library
            endpoint = "/query/v1/suiteql"
            headers = {"Prefer": "transient"}
            
            response = await self.netsuite.rest_api.post(
                endpoint,
                json=params,
                headers=headers
            )
            
            logger.info(f"NetSuite API response successful")
            logger.info(f"Response data: {str(response)[:200]}...")
            
            return response
            
        except Exception as e:
            logger.error(f"NetSuite SuiteQL execution failed: {str(e)}")
            error_msg = str(e)
            
            # Handle different error types
            if "401" in error_msg or "Unauthorized" in error_msg:
                raise HTTPException(
                    status_code=401,
                    detail="NetSuite authentication failed. Please check your credentials."
                )
            elif "403" in error_msg or "Forbidden" in error_msg:
                raise HTTPException(
                    status_code=403,
                    detail="NetSuite access denied. Please check your SuiteQL permissions."
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"NetSuite API error: {error_msg}"
                )

# Initialize NetSuite client
try:
    netsuite_client = NetSuiteClient()
except ValueError as e:
    logger.error(f"NetSuite client initialization error: {e}")
    netsuite_client = None

@app.get("/")
async def root():
    return {"message": "SuiteQL API is running", "library": "netsuite-python"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "netsuite_configured": netsuite_client is not None,
        "library": "netsuite-python"
    }

@app.get("/api/config")
async def get_current_config():
    """Check current NetSuite configuration status (masked for security)"""
    if not netsuite_client:
        return {"configured": False}
    
    return {
        "configured": True,
        "account_id": netsuite_client.account_id,
        "consumer_key": "••••••••" if netsuite_client.consumer_key else "",
        "consumer_secret": "••••••••" if netsuite_client.consumer_secret else "",
        "token_id": "••••••••" if netsuite_client.token_id else "",
        "token_secret": "••••••••" if netsuite_client.token_secret else ""
    }

@app.post("/api/config")
async def update_config(config_request: NetSuiteConfigRequest):
    """Update NetSuite configuration"""
    global netsuite_client
    
    try:
        # Create new client or update existing client
        if netsuite_client:
            netsuite_client.update_config(
                account_id=config_request.account_id,
                consumer_key=config_request.consumer_key,
                consumer_secret=config_request.consumer_secret,
                token_id=config_request.token_id,
                token_secret=config_request.token_secret
            )
        else:
            netsuite_client = NetSuiteClient(
                account_id=config_request.account_id,
                consumer_key=config_request.consumer_key,
                consumer_secret=config_request.consumer_secret,
                token_id=config_request.token_id,
                token_secret=config_request.token_secret
            )
        
        return {"message": "Configuration updated successfully"}
        
    except Exception as e:
        logger.error(f"Configuration update failed: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid configuration: {str(e)}"
        )

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
        result = await netsuite_client.execute_suiteql(
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
        # Simple test query
        test_query = "SELECT id, tranid FROM Transaction WHERE RowNum <= 1"
        
        response = await netsuite_client.execute_suiteql(test_query)
        
        return {
            "status": "success",
            "message": "NetSuite authentication successful",
            "library": "netsuite-python",
            "test_query": test_query,
            "response_preview": str(response)[:200] if response else "No response"
        }
        
    except Exception as e:
        return {
            "status": "error", 
            "error": str(e),
            "library": "netsuite-python"
        }

@app.get("/api/sample-queries")
async def get_sample_queries():
    """Get sample SuiteQL queries"""
    return {
        "queries": [
            {
                "name": "Customer List",
                "query": "SELECT id, entityid, companyname, email FROM customer WHERE isinactive = 'F' AND RowNum <= 10",
                "description": "Retrieve a list of active customers"
            },
            {
                "name": "Recent Transactions", 
                "query": "SELECT id, tranid, type, trandate, entity FROM Transaction WHERE trandate >= SYSDATE - 30 AND RowNum <= 10 ORDER BY trandate DESC",
                "description": "Recent transactions from last 30 days"
            },
            {
                "name": "Sales Orders",
                "query": "SELECT id, tranid, trandate, entity, status FROM Transaction WHERE type = 'SalesOrd' AND RowNum <= 10 ORDER BY trandate DESC",
                "description": "Recent sales orders"
            },
            {
                "name": "Item List",
                "query": "SELECT id, itemid, displayname, itemtype FROM item WHERE isinactive = 'F' AND RowNum <= 10",
                "description": "Active items in inventory"
            },
            {
                "name": "Transaction with Customer Info",
                "query": "SELECT t.id, t.tranid, t.trandate, c.companyname FROM Transaction t LEFT JOIN customer c ON t.entity = c.id WHERE t.type = 'SalesOrd' AND RowNum <= 5",
                "description": "Sales orders with customer names (JOIN example)"
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)