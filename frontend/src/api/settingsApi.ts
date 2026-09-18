import { apiClient } from './client';
import type { User, UserProfileUpdateInput, NotificationSettings, TeamMember } from '../types/user';

export const settingsApi = {
  async getProfile(): Promise<User> {
    const response = await apiClient.get<User>('/users/profile');
    return response.data;
  },

  async updateProfile(data: UserProfileUpdateInput): Promise<User> {
    const response = await apiClient.put<User>('/users/profile', data);
    return response.data;
  },

  async getNotificationSettings(): Promise<NotificationSettings> {
    const response = await apiClient.get<NotificationSettings>('/users/notifications');
    return response.data;
  },

  async updateNotificationSettings(data: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const response = await apiClient.put<NotificationSettings>('/users/notifications', data);
    return response.data;
  },

  async getTeamMembers(): Promise<TeamMember[]> {
    const response = await apiClient.get<TeamMember[]>('/team');
    return response.data;
  },

  async addTeamMember(member: Omit<TeamMember, 'id'>): Promise<TeamMember> {
    const response = await apiClient.post<TeamMember>('/team', member);
    return response.data;
  },
};
