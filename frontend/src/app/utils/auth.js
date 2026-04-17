// frontend/utils/auth.js

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

export const authService = {
  // Save authentication data after login
  login(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  // Get stored token
  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  // Get stored user data
  getUser() {
    const userJson = localStorage.getItem(AUTH_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  },

  // Get user ID specifically
  getUserId() {
    const user = this.getUser();
    return user ? user.id : null;
  },

  // Get user role ID specifically
  getRoleId() {
    const user = this.getUser();
    return user ? user.role_id : null;
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  },

  // Logout and clear data
  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  },

  // Get authorization header for API requests
  getAuthHeader() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};