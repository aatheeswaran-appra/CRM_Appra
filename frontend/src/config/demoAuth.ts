// ============================================================================
// TEMPORARY DEMO AUTH — REMOVE WHEN BACKEND AUTH IS CONNECTED
// ============================================================================

import type { User } from '../types/user';

export const DEMO_CREDENTIALS = {
  email: 'demo@appracrm.com',
  password: 'Demo@12345',
} as const;

export const DEMO_USER: User = {
  id: 'demo-user',
  name: 'Demo User',
  email: 'demo@appracrm.com',
  phone: '98765 43210',
  role: 'Administrator',
  avatarInitials: 'DU',
  createdAt: '2026-09-18T00:00:00.000Z',
};

export const DEMO_TOKEN = 'appra_demo_token_authenticated_session';

/**
 * Validates if the provided email and password match the temporary demo credentials.
 */
export function isDemoLogin(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === DEMO_CREDENTIALS.email.toLowerCase() &&
    password === DEMO_CREDENTIALS.password
  );
}
