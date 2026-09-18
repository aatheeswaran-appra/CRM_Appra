import { apiClient } from './client';
import type { FollowUpItem, CreateFollowUpInput } from '../types/followUp';

export const followUpApi = {
  async getFollowUps(params?: { filter?: 'today' | 'overdue' | 'all'; date?: string }): Promise<FollowUpItem[]> {
    const response = await apiClient.get<FollowUpItem[]>('/follow-ups', { params });
    return response.data;
  },

  async getTodayFollowUps(): Promise<FollowUpItem[]> {
    const response = await apiClient.get<FollowUpItem[]>('/follow-ups/today');
    return response.data;
  },

  async getOverdueFollowUps(): Promise<FollowUpItem[]> {
    const response = await apiClient.get<FollowUpItem[]>('/follow-ups/overdue');
    return response.data;
  },

  async createFollowUp(input: CreateFollowUpInput): Promise<FollowUpItem> {
    const response = await apiClient.post<FollowUpItem>('/follow-ups', input);
    return response.data;
  },

  async updateFollowUpStatus(id: string, status: string): Promise<FollowUpItem> {
    const response = await apiClient.patch<FollowUpItem>(`/follow-ups/${id}/status`, { status });
    return response.data;
  },

  async deleteFollowUp(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(`/follow-ups/${id}`);
    return response.data;
  },
};
