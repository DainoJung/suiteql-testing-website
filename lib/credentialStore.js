// Secure in-memory storage for NetSuite credentials
// Uses encryption and session-based isolation

import crypto from 'crypto';

class SecureCredentialStore {
  constructor() {
    // Store encrypted credentials by session ID
    this.credentials = new Map();
    // Generate a unique encryption key for this server instance
    this.encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY || crypto.randomBytes(32);
    this.algorithm = 'aes-256-gcm';
  }

  // Encrypt sensitive data
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  // Decrypt sensitive data
  decrypt(encryptedData) {
    const decipher = crypto.createDecipheriv(
      this.algorithm, 
      this.encryptionKey, 
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Store credentials with encryption
  set(sessionId, credentials) {
    if (!sessionId || !credentials) {
      throw new Error('Session ID and credentials are required');
    }

    // Validate required fields
    const required = ['account_id', 'consumer_key', 'consumer_secret', 'token_id', 'token_secret'];
    for (const field of required) {
      if (!credentials[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Encrypt sensitive fields
    const encryptedCreds = {
      account_id: credentials.account_id, // Keep account ID in plain text for logging
      consumer_key: this.encrypt(credentials.consumer_key),
      consumer_secret: this.encrypt(credentials.consumer_secret),
      token_id: this.encrypt(credentials.token_id),
      token_secret: this.encrypt(credentials.token_secret),
      timestamp: Date.now(),
      sessionId: sessionId
    };

    this.credentials.set(sessionId, encryptedCreds);
    
    // Set automatic cleanup after 4 hours
    setTimeout(() => {
      this.delete(sessionId);
    }, 4 * 60 * 60 * 1000);
  }

  // Retrieve and decrypt credentials
  get(sessionId) {
    if (!sessionId) return null;
    
    const encryptedCreds = this.credentials.get(sessionId);
    if (!encryptedCreds) return null;
    
    // Check expiration (4 hours)
    const expirationTime = 4 * 60 * 60 * 1000;
    if (Date.now() - encryptedCreds.timestamp > expirationTime) {
      this.credentials.delete(sessionId);
      return null;
    }
    
    try {
      // Decrypt sensitive fields
      return {
        account_id: encryptedCreds.account_id,
        consumer_key: this.decrypt(encryptedCreds.consumer_key),
        consumer_secret: this.decrypt(encryptedCreds.consumer_secret),
        token_id: this.decrypt(encryptedCreds.token_id),
        token_secret: this.decrypt(encryptedCreds.token_secret)
      };
    } catch (error) {
      console.error('Failed to decrypt credentials:', error);
      this.credentials.delete(sessionId);
      return null;
    }
  }

  // Remove credentials
  delete(sessionId) {
    if (sessionId) {
      this.credentials.delete(sessionId);
    }
  }

  // Check if credentials exist
  has(sessionId) {
    if (!sessionId) return false;
    const creds = this.credentials.get(sessionId);
    if (!creds) return false;
    
    // Check expiration
    const expirationTime = 4 * 60 * 60 * 1000;
    if (Date.now() - creds.timestamp > expirationTime) {
      this.credentials.delete(sessionId);
      return false;
    }
    
    return true;
  }

  // Get credential status without exposing sensitive data
  getStatus(sessionId) {
    if (!this.has(sessionId)) {
      return { configured: false };
    }
    
    const encryptedCreds = this.credentials.get(sessionId);
    return {
      configured: true,
      account_id: encryptedCreds.account_id,
      timestamp: encryptedCreds.timestamp,
      expiresIn: Math.max(0, (4 * 60 * 60 * 1000) - (Date.now() - encryptedCreds.timestamp))
    };
  }
}

// Create a singleton instance
const store = new SecureCredentialStore();

export default store;