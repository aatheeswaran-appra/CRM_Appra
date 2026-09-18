import { apiClient } from './client';
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '../types/customer';

const STATUS_TO_FRONTEND: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  INTERESTED: 'Interested',
  FOLLOW_UP: 'Follow-up',
  CLOSED: 'Closed',
  NOT_INTERESTED: 'Not Interested',
};

const STATUS_TO_BACKEND: Record<string, string> = {
  'New': 'NEW',
  'Contacted': 'CONTACTED',
  'Interested': 'INTERESTED',
  'Follow-up': 'FOLLOW_UP',
  'Closed': 'CLOSED',
  'Not Interested': 'NOT_INTERESTED',
};

const SOURCE_TO_FRONTEND: Record<string, string> = {
  WEBSITE: 'Website',
  WHATSAPP: 'WhatsApp',
  REFERRAL: 'Referral',
  INSTAGRAM: 'Instagram',
  CALL: 'Call',
  OTHER: 'Other',
};

const SOURCE_TO_BACKEND: Record<string, string> = {
  'Website': 'WEBSITE',
  'WhatsApp': 'WHATSAPP',
  'Referral': 'REFERRAL',
  'Instagram': 'INSTAGRAM',
  'Call': 'CALL',
  'Other': 'OTHER',
};

const CONTACT_TO_BACKEND: Record<string, string> = {
  'WhatsApp': 'WHATSAPP',
  'Call': 'CALL',
  'Either': 'EITHER',
};

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function mapBackendCustomer(item: any): Customer {
  return {
    id: String(item.id),
    name: item.name,
    initials: getInitials(item.name),
    phone: item.phone,
    requirement: item.requirement,
    source: SOURCE_TO_FRONTEND[item.source] || item.source || 'Other',
    location: item.location || '',
    notes: item.notes || '',
    status: STATUS_TO_FRONTEND[item.status] || item.status || 'New',
    createdAt: item.createdAt || new Date().toISOString(),
    relativeTime: formatRelativeTime(item.createdAt),
    avatarColor: getAvatarColor(item.name || ''),
    nextFollowUpDate: item.nextFollowUpAt ? item.nextFollowUpAt.slice(0, 10) : undefined,
  };
}

export const customerApi = {
  async getCustomers(): Promise<Customer[]> {
    const response = await apiClient.get('/customers');
    const rawList = response.data?.data || (Array.isArray(response.data) ? response.data : []);
    return rawList.map(mapBackendCustomer);
  },

  async getCustomerById(id: string): Promise<Customer> {
    const response = await apiClient.get(`/customers/${id}`);
    const raw = response.data?.data || response.data;
    return mapBackendCustomer(raw);
  },

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    const today = new Date().toISOString().slice(0, 10);
    const date = input.nextFollowUpDate || today;
    const time = input.nextFollowUpTime || '10:00';
    const preferredContact = (input.preferredContact && CONTACT_TO_BACKEND[input.preferredContact]) || 'WHATSAPP';
    const source = (input.source && SOURCE_TO_BACKEND[input.source]) || 'OTHER';

    const payload = {
      name: input.name.trim(),
      phone: input.phone.trim(),
      requirement: input.requirement.trim(),
      source,
      location: input.location?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      followUp: {
        date,
        time,
        preferredContact,
        notes: input.notes?.trim() || 'Initial follow-up',
      },
    };

    const response = await apiClient.post('/customers', payload);
    const raw = response.data?.data || response.data;
    return mapBackendCustomer(raw);
  },

  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const payload: Record<string, any> = {};
    if (input.name !== undefined) payload.name = input.name.trim();
    if (input.phone !== undefined) payload.phone = input.phone.trim();
    if (input.requirement !== undefined) payload.requirement = input.requirement.trim();
    if (input.source !== undefined) payload.source = SOURCE_TO_BACKEND[input.source] || input.source;
    if (input.location !== undefined) payload.location = input.location.trim() || null;
    if (input.notes !== undefined) payload.notes = input.notes.trim() || null;
    if (input.status !== undefined) payload.status = STATUS_TO_BACKEND[input.status] || input.status;

    const response = await apiClient.patch(`/customers/${id}`, payload);
    const raw = response.data?.data || response.data;
    return mapBackendCustomer(raw);
  },

  async deleteCustomer(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/customers/${id}`);
    return { success: true, message: response.data?.message || 'Deleted successfully' };
  },

  async searchCustomers(query: string): Promise<Customer[]> {
    const response = await apiClient.get('/customers', {
      params: { search: query },
    });
    const rawList = response.data?.data || (Array.isArray(response.data) ? response.data : []);
    return rawList.map(mapBackendCustomer);
  },
};
