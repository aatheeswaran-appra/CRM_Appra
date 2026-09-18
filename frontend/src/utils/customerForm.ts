import { isAxiosError } from 'axios';
import type { CreateCustomerInput } from '../types/customer';

export const customerSources = ['Website', 'WhatsApp', 'Referral', 'Instagram', 'Call', 'Other'];
export const customerStatuses = ['New', 'Contacted', 'Interested', 'Follow-up', 'Closed', 'Not Interested'];

export function validateCustomer(input: Pick<CreateCustomerInput, 'name' | 'phone' | 'requirement'>) {
  const errors: Record<string, string> = {};
  if (!input.name.trim()) errors.name = 'Customer name is required';
  else if (input.name.trim().length > 120) errors.name = 'Use 120 characters or fewer';
  const phone = input.phone.trim();
  if (!phone) errors.phone = 'Phone number is required';
  else if (!/^\+?[0-9 ()-]+$/.test(phone) || !/^[0-9]{7,15}$/.test(phone.replace(/\D/g, '')) || phone.length > 32) {
    errors.phone = 'Enter 7-15 digits, with an optional country code';
  }
  if (!input.requirement.trim()) errors.requirement = 'Requirement details are required';
  else if (input.requirement.trim().length > 500) errors.requirement = 'Use 500 characters or fewer';
  return errors;
}

export function customerErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) return message.join(' ');
  }
  return error instanceof Error ? error.message : fallback;
}
