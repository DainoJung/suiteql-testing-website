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
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SuiteQL API", description="NetSuite SuiteQL Query Interface")

# CORS middleware for Next.js frontend
# Get allowed origins from environment or use defaults
allowed_origins = os.getenv("CORS_ORIGINS", "*").split(",") if os.getenv("CORS_ORIGINS") != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for Vercel deployment
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
        
        # Validate credential formats
        self._validate_credentials()
        
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
    
    def _validate_credentials(self):
        """Validate NetSuite credential formats"""
        issues = []
        warnings = []
        
        # Check Account ID format
        if not self.account_id or len(self.account_id) < 5:
            issues.append("Account ID too short")
        elif '_SB' in self.account_id or '_sb' in self.account_id:
            logger.info("Detected sandbox account format")
        
        # Check Consumer Key format (should be 64 characters)
        if not self.consumer_key or len(self.consumer_key) != 64:
            issues.append(f"Consumer Key should be 64 characters, got {len(self.consumer_key) if self.consumer_key else 0}")
        
        # Check Consumer Secret format (should be 64 characters)
        if not self.consumer_secret or len(self.consumer_secret) != 64:
            issues.append(f"Consumer Secret should be 64 characters, got {len(self.consumer_secret) if self.consumer_secret else 0}")
        
        # Check Token ID format (should be 64 characters, NOT email)
        if self.token_id and '@' in self.token_id:
            issues.append("🚨 CRITICAL: Token ID appears to be an email address - it should be a 64-character token")
            issues.append("📋 TO FIX: Go to NetSuite → Setup → Users/Roles → Access Tokens → Generate new token")
        elif not self.token_id or len(self.token_id) != 64:
            issues.append(f"Token ID should be 64 characters, got {len(self.token_id) if self.token_id else 0}")
        
        # Check Token Secret format (should be 64 characters)
        if not self.token_secret or len(self.token_secret) != 64:
            issues.append(f"Token Secret should be 64 characters, got {len(self.token_secret) if self.token_secret else 0}")
        
        # Log current values for debugging (masked)
        logger.info("Current credential formats:")
        logger.info(f"  Account ID: {self.account_id}")
        logger.info(f"  Consumer Key: {len(self.consumer_key) if self.consumer_key else 0} chars")
        logger.info(f"  Consumer Secret: {len(self.consumer_secret) if self.consumer_secret else 0} chars")
        logger.info(f"  Token ID: {len(self.token_id) if self.token_id else 0} chars {'(contains @)' if self.token_id and '@' in self.token_id else ''}")
        logger.info(f"  Token Secret: {len(self.token_secret) if self.token_secret else 0} chars")
        
        if issues:
            logger.error("❌ CREDENTIAL VALIDATION FAILED:")
            for issue in issues:
                logger.error(f"  - {issue}")
            logger.error("\n📋 TROUBLESHOOTING STEPS:")
            logger.error("  1. Go to NetSuite → Setup → Integration → Web Services Preferences")
            logger.error("  2. Go to Setup → Users/Roles → Access Tokens")
            logger.error("  3. Create or regenerate tokens (NOT user credentials)")
            logger.error("  4. Use the 64-character TOKEN values, not email/password")
            
            # Don't raise exception, just log - let connection attempt provide real error
            return False
        
        logger.info("✅ All credential formats look correct")
        return True
    
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
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test NetSuite connection with minimal request"""
        try:
            logger.info("Testing NetSuite connection...")
            logger.info(f"Account ID: {self.account_id}")
            logger.info(f"Consumer Key: {self.consumer_key[:8]}...{self.consumer_key[-4:]}")
            logger.info(f"Token ID: {self.token_id[:8]}...{self.token_id[-4:]}")
            
            # Simple test query
            test_query = "SELECT id FROM Transaction WHERE RowNum <= 1"
            response = await self.execute_suiteql(test_query)
            return {"status": "success", "message": "Connection test passed"}
            
        except Exception as e:
            logger.error(f"Connection test failed: {str(e)}")
            return {"status": "failed", "error": str(e)}

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
            
            logger.info(f"Making request to endpoint: {endpoint}")
            
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
            
            # Enhanced error handling with specific guidance
            if "401" in error_msg or "INVALID_LOGIN" in error_msg:
                logger.error("Authentication failed - check credentials and integration setup")
                raise HTTPException(
                    status_code=401,
                    detail="NetSuite authentication failed. Please verify: 1) Consumer Key/Secret are correct, 2) Token ID/Secret are correct, 3) Integration record is active, 4) User role has SuiteQL permissions."
                )
            elif "403" in error_msg or "Forbidden" in error_msg:
                logger.error("Access denied - check permissions")
                raise HTTPException(
                    status_code=403,
                    detail="NetSuite access denied. Please check your SuiteQL permissions and ensure the role assigned to the integration has 'SuiteQL' permission enabled."
                )
            else:
                logger.error(f"Unexpected error: {error_msg}")
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

@app.get("/api/health")
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

# For Vercel deployment
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)