import { jwtDecode } from 'jwt-decode';

export const decodeJWT = (token) => {
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

export const isTokenExpired = (token) => {
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

export const getTokenPayload = (token) => {
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('Error getting token payload:', error);
    return null;
  }
};
