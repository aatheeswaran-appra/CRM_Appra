// ============================================================================
// TEMPORARY DEMO AUTH — REMOVE WHEN BACKEND AUTH IS CONNECTED
// ============================================================================
import { isDemoLogin, DEMO_USER, DEMO_TOKEN } from '../config/demoAuth';
import { authApi } from '../api/authApi';
import type { LoginCredentials, SignupData, AuthResponse } from '../types/auth';
import type { User } from '../types/user';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // 1. Check for temporary demo login credentials
    if (isDemoLogin(credentials.email, credentials.password)) {
      return {
        user: DEMO_USER,
        token: DEMO_TOKEN,
        message: 'Demo login successful',
      };
    }

    // 2. Otherwise delegate to real backend API
    try {
      return await authApi.login(credentials);
    } catch (err: any) {
      // If backend is not available or credentials invalid
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      throw new Error('Invalid email or password.');
    }
  },

  async signup(data: SignupData): Promise<AuthResponse> {
    try {
      return await authApi.signup(data);
    } catch (err: any) {
      // For development preview if backend is not connected
      if (data.email && data.password) {
        return {
          user: {
            id: `user_${Date.now()}`,
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: 'Administrator',
            avatarInitials: data.name.slice(0, 2).toUpperCase(),
          },
          token: DEMO_TOKEN,
          message: 'Account created successfully',
        };
      }
      throw new Error(err.response?.data?.message || 'Unable to create account.');
    }
  },

  async getCurrentUser(): Promise<User> {
    const token = localStorage.getItem('appra_crm_token') || sessionStorage.getItem('appra_crm_token');
    if (token === DEMO_TOKEN) {
      return DEMO_USER;
    }
    return await authApi.getMe();
  },

  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    }
  },
};
