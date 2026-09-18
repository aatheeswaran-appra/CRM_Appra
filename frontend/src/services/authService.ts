import { isDemoLogin, DEMO_USER, DEMO_TOKEN } from '../config/demoAuth';
import { authApi } from '../api/authApi';
import type { LoginCredentials, SignupData, AuthResponse } from '../types/auth';
import type { User } from '../types/user';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Connect to real backend API to authenticate and log into login_records
      return await authApi.login(credentials);
    } catch (err: any) {
      // If demo credentials and backend is unreachable, fallback to demo
      if (isDemoLogin(credentials.email, credentials.password)) {
        return {
          user: DEMO_USER,
          token: DEMO_TOKEN,
          message: 'Demo login successful',
        };
      }
      const msg = err.response?.data?.message || err.message || 'Invalid email or password.';
      throw new Error(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join(', ') : 'Invalid email or password.');
    }
  },

  async signup(data: SignupData): Promise<AuthResponse> {
    try {
      return await authApi.signup(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Unable to create account.';
      throw new Error(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join(', ') : 'Unable to create account.');
    }
  },

  async getCurrentUser(): Promise<User> {
    try {
      return await authApi.getMe();
    } catch {
      const token = localStorage.getItem('appra_crm_token') || sessionStorage.getItem('appra_crm_token');
      if (token === DEMO_TOKEN) {
        return DEMO_USER;
      }
      const savedUser = localStorage.getItem('appra_crm_user') || sessionStorage.getItem('appra_crm_user');
      if (savedUser) {
        return JSON.parse(savedUser);
      }
      return DEMO_USER;
    }
  },

  async logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    }
  },
};
