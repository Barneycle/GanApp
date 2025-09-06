// JWT utilities for QR code signing and verification
import { jwtDecode } from 'jwt-decode';

// Secret key for JWT signing (in production, this should be in environment variables)
const JWT_SECRET = 'ganapp-qr-secret-key-2024';

// Function to create a JWT token for QR code data
export const createQRToken = (userData) => {
  try {
    const payload = {
      userId: userData.id,
      userEmail: userData.email,
      userName: `${userData.first_name} ${userData.last_name}`.trim() || userData.email,
      userRole: userData.role,
      timestamp: new Date().toISOString(),
      type: 'user_qr'
    };

    // Create a simple JWT-like token (in production, use a proper JWT library)
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadEncoded = btoa(JSON.stringify(payload));
    
    // Create a simple signature (in production, use proper HMAC)
    const signature = btoa(JWT_SECRET + payloadEncoded);
    
    return `${header}.${payloadEncoded}.${signature}`;
  } catch (error) {
    console.error('Error creating QR token:', error);
    throw new Error('Failed to create QR token');
  }
};

// Function to verify and decode a QR token
export const verifyQRToken = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [header, payload, signature] = parts;
    
    // Decode the payload
    const decodedPayload = JSON.parse(atob(payload));
    
    // Verify signature (simple check - in production, use proper HMAC verification)
    const expectedSignature = btoa(JWT_SECRET + payload);
    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    // Check if token is expired (optional - set expiry time)
    const tokenTimestamp = new Date(decodedPayload.timestamp);
    const now = new Date();
    const tokenAge = now - tokenTimestamp;
    
    // Token expires after 24 hours (86400000 milliseconds)
    if (tokenAge > 86400000) {
      throw new Error('Token expired');
    }

    return decodedPayload;
  } catch (error) {
    console.error('Error verifying QR token:', error);
    throw new Error('Invalid QR token');
  }
};

// Function to create QR code data string in the format: userID | timestamp | signature
export const createQRDataString = (userData) => {
  try {
    const token = createQRToken(userData);
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    
    // Format: userID | timestamp | signature
    return `${payload.userId}|${payload.timestamp}|${parts[2]}`;
  } catch (error) {
    console.error('Error creating QR data string:', error);
    throw new Error('Failed to create QR data string');
  }
};

// Function to parse QR data string and verify it
export const parseAndVerifyQRData = (qrDataString) => {
  try {
    const parts = qrDataString.split('|');
    if (parts.length !== 3) {
      throw new Error('Invalid QR data format');
    }

    const [userId, timestamp, signature] = parts;
    
    // Reconstruct the token
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      userId,
      timestamp,
      type: 'user_qr'
    }));
    
    const token = `${header}.${payload}.${signature}`;
    
    // Verify the token
    return verifyQRToken(token);
  } catch (error) {
    console.error('Error parsing QR data:', error);
    throw new Error('Invalid QR data');
  }
};

// Function to check if a QR token is valid
export const isValidQRToken = (token) => {
  try {
    verifyQRToken(token);
    return true;
  } catch (error) {
    return false;
  }
};

// Function to get user info from QR token without verification (for display purposes)
export const getQRTokenInfo = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    return {
      userId: payload.userId,
      userEmail: payload.userEmail,
      userName: payload.userName,
      userRole: payload.userRole,
      timestamp: payload.timestamp,
      type: payload.type
    };
  } catch (error) {
    console.error('Error getting QR token info:', error);
    return null;
  }
};
