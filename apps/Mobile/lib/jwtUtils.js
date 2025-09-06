import { jwtDecode } from 'jwt-decode';

export const createQRDataString = (user) => {
  if (!user) return null;
  
  const payload = {
    userId: user.id,
    userEmail: user.email,
    userName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
    userRole: user.role || 'participant',
    timestamp: Date.now(),
    type: 'user_qr'
  };

  // For demo purposes, we'll create a simple string representation
  // In production, you'd want to use proper JWT signing
  return JSON.stringify(payload);
};

export const getQRTokenInfo = (tokenString) => {
  try {
    const tokenData = JSON.parse(tokenString);
    return {
      success: true,
      data: tokenData
    };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid token format'
    };
  }
};
