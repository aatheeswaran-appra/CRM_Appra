import { apiClient } from './client';
import type { FollowUpItem, CreateFollowUpInput } from '../types/followUp';

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

function formatTimeTo12Hour(dateObj: Date): string {
  return dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function mapBackendFollowUp(item: any): FollowUpItem {
  const followUpDate = item.followUpAt ? new Date(item.followUpAt) : new Date();
  const timeFormatted = formatTimeTo12Hour(followUpDate);
  const dateFormatted = followUpDate.toISOString().slice(0, 10);

  const status = item.isOverdue
    ? 'Overdue'
    : item.status === 'COMPLETED'
    ? 'Completed'
    : 'Due Today';

  return {
    id: String(item.id),
    time: timeFormatted,
    date: dateFormatted,
    customerId: item.customerId ? String(item.customerId) : undefined,
    customerName: item.customerName || 'Customer',
    customerInitials: getInitials(item.customerName || 'Customer'),
    requirement: item.requirement || '',
    phone: item.phone || '',
    status,
    isOverdue: !!item.isOverdue,
    avatarColor: getAvatarColor(item.customerName || ''),
    preferredContact:
      item.preferredContact === 'WHATSAPP'
        ? 'WhatsApp'
        : item.preferredContact === 'CALL'
        ? 'Call'
        : 'Either',
  };
}

export const followUpApi = {
  async getFollowUps(params?: { filter?: 'today' | 'overdue' | 'all'; date?: string }): Promise<FollowUpItem[]> {
    const queryParams: Record<string, string> = {};
    if (params?.filter === 'today') queryParams.type = 'today';
    else if (params?.filter === 'overdue') queryParams.type = 'overdue';
    else if (params?.date) queryParams.date = params.date;

    const response = await apiClient.get('/follow-ups', { params: queryParams });
    const rawList = response.data?.data || (Array.isArray(response.data) ? response.data : []);
    return rawList.map(mapBackendFollowUp);
  },

  async getTodayFollowUps(): Promise<FollowUpItem[]> {
    const response = await apiClient.get('/follow-ups', {
      params: { type: 'today' },
    });
    const rawList = response.data?.data || (Array.isArray(response.data) ? response.data : []);
    return rawList.map(mapBackendFollowUp);
  },

  async getOverdueFollowUps(): Promise<FollowUpItem[]> {
    const response = await apiClient.get('/follow-ups', {
      params: { type: 'overdue' },
    });
    const rawList = response.data?.data || (Array.isArray(response.data) ? response.data : []);
    return rawList.map(mapBackendFollowUp);
  },

  async createFollowUp(input: CreateFollowUpInput): Promise<FollowUpItem> {
    const preferredContact =
      input.preferredContact === 'Call'
        ? 'CALL'
        : input.preferredContact === 'Either'
        ? 'EITHER'
        : 'WHATSAPP';

    // Ensure 24-hour HH:mm
    let time = input.time || '10:00';
    if (time.includes('AM') || time.includes('PM')) {
      const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = match[2];
        const isPM = match[3].toUpperCase() === 'PM';
        if (isPM && h < 12) h += 12;
        if (!isPM && h === 12) h = 0;
        time = `${String(h).padStart(2, '0')}:${m}`;
      }
    }

    const payload = {
      customerId: Number(input.customerId) || 1,
      date: input.date || new Date().toISOString().slice(0, 10),
      time,
      preferredContact,
      notes: input.requirement || 'Scheduled follow-up',
    };

    const response = await apiClient.post('/follow-ups', payload);
    const raw = response.data?.data || response.data;
    return mapBackendFollowUp(raw);
  },

  async updateFollowUpStatus(id: string, status: string): Promise<FollowUpItem> {
    if (status.toLowerCase() === 'completed') {
      const response = await apiClient.patch(`/follow-ups/${id}/complete`, {});
      const raw = response.data?.data || response.data;
      return mapBackendFollowUp(raw);
    }

    const response = await apiClient.patch(`/follow-ups/${id}`, {});
    const raw = response.data?.data || response.data;
    return mapBackendFollowUp(raw);
  },

  async deleteFollowUp(id: string): Promise<{ success: boolean }> {
    await apiClient.delete(`/follow-ups/${id}`);
    return { success: true };
  },
};
