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
        return {
            "status": "error",
            "error": "NetSuite client not configured. Please set up credentials first.",
            "library": "netsuite-python"
        }
    
    try:
        result = await netsuite_client.test_connection()
        
        if result["status"] == "success":
            return {
                "status": "success",
                "message": "NetSuite authentication successful",
                "library": "netsuite-python",
                "account_id": netsuite_client.account_id
            }
        else:
            return {
                "status": "error",
                "error": result["error"],
                "library": "netsuite-python",
                "troubleshooting": [
                    "1. Verify Consumer Key and Consumer Secret in integration record",
                    "2. Verify Token ID and Token Secret are active",
                    "3. Check if integration record is enabled",
                    "4. Ensure user role has 'SuiteQL' permission",
                    "5. Check Login Audit Trail in NetSuite for more details"
                ]
            }
        
    except Exception as e:
        return {
            "status": "error", 
            "error": str(e),
            "library": "netsuite-python"
        }

@app.get("/api/validate-credentials")
async def validate_credentials():
    """Validate credential formats and provide detailed feedback"""
    if not netsuite_client:
        return {
            "valid": False,
            "configured": False,
            "message": "NetSuite client not configured"
        }
    
    # Perform validation
    validation_result = netsuite_client._validate_credentials()
    
    # Detailed format checking
    issues = []
    checks = []
    
    # Account ID
    if netsuite_client.account_id:
        if len(netsuite_client.account_id) >= 5:
            checks.append({"item": "Account ID", "status": "✅", "message": f"Format looks correct ({netsuite_client.account_id})"})
        else:
            checks.append({"item": "Account ID", "status": "❌", "message": "Too short"})
            issues.append("Account ID format issue")
    
    # Consumer Key
    if netsuite_client.consumer_key:
        if len(netsuite_client.consumer_key) == 64:
            checks.append({"item": "Consumer Key", "status": "✅", "message": "64 characters - correct format"})
        else:
            checks.append({"item": "Consumer Key", "status": "❌", "message": f"Should be 64 characters, got {len(netsuite_client.consumer_key)}"})
            issues.append("Consumer Key length issue")
    
    # Consumer Secret
    if netsuite_client.consumer_secret:
        if len(netsuite_client.consumer_secret) == 64:
            checks.append({"item": "Consumer Secret", "status": "✅", "message": "64 characters - correct format"})
        else:
            checks.append({"item": "Consumer Secret", "status": "❌", "message": f"Should be 64 characters, got {len(netsuite_client.consumer_secret)}"})
            issues.append("Consumer Secret length issue")
    
    # Token ID (critical check)
    if netsuite_client.token_id:
        if '@' in netsuite_client.token_id:
            checks.append({"item": "Token ID", "status": "🚨", "message": "CRITICAL: This appears to be an email address, not a token!"})
            issues.append("Token ID is email format instead of token")
        elif len(netsuite_client.token_id) == 64:
            checks.append({"item": "Token ID", "status": "✅", "message": "64 characters - correct format"})
        else:
            checks.append({"item": "Token ID", "status": "❌", "message": f"Should be 64 characters, got {len(netsuite_client.token_id)}"})
            issues.append("Token ID length issue")
    
    # Token Secret
    if netsuite_client.token_secret:
        if len(netsuite_client.token_secret) == 64:
            checks.append({"item": "Token Secret", "status": "✅", "message": "64 characters - correct format"})
        else:
            checks.append({"item": "Token Secret", "status": "❌", "message": f"Should be 64 characters, got {len(netsuite_client.token_secret)}"})
            issues.append("Token Secret length issue")
    
    return {
        "valid": validation_result,
        "configured": True,
        "issues": issues,
        "checks": checks,
        "troubleshooting": [
            "1. Go to NetSuite → Setup → Integration → Web Services Preferences",
            "2. Go to Setup → Users/Roles → Access Tokens",
            "3. Create new Access Token (NOT user login credentials)",
            "4. Copy the 64-character Token ID and Token Secret values",
            "5. Ensure Integration Record is enabled",
            "6. Verify user role has 'SuiteQL' permission"
        ] if not validation_result else []
    }

@app.get("/api/debug-auth")
async def debug_auth():
    """Debug authentication configuration"""
    if not netsuite_client:
        return {
            "configured": False,
            "message": "NetSuite client not configured"
        }
    
    return {
        "configured": True,
        "account_id": netsuite_client.account_id,
        "consumer_key": f"{netsuite_client.consumer_key[:8]}...{netsuite_client.consumer_key[-4:]}" if netsuite_client.consumer_key else None,
        "consumer_secret": f"{netsuite_client.consumer_secret[:4]}...{netsuite_client.consumer_secret[-4:]}" if netsuite_client.consumer_secret else None,
        "token_id": f"{netsuite_client.token_id[:8]}...{netsuite_client.token_id[-4:]}" if netsuite_client.token_id else None,
        "token_secret": f"{netsuite_client.token_secret[:4]}...{netsuite_client.token_secret[-4:]}" if netsuite_client.token_secret else None,
        "library": "netsuite-python",
        "checklist": [
            "✓ Consumer Key format: Should be 64 characters",
            "✓ Consumer Secret format: Should be 64 characters", 
            "✓ Token ID format: Should be 64 characters",
            "✓ Token Secret format: Should be 64 characters",
            "✓ Account ID format: Should be like 'ACCT123456_SB1' for sandbox or 'ACCT123456' for production",
            "✓ Integration Record: Must be 'Enabled' in NetSuite",
            "✓ Token: Must be active and not expired",
            "✓ Role: Must have 'SuiteQL' permission enabled"
        ]
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