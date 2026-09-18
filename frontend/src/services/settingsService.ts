import { settingsApi } from '../api/settingsApi';
import type { User, UserProfileUpdateInput, NotificationSettings, TeamMember } from '../types/user';

export const settingsService = {
  async getProfile(): Promise<User> {
    return await settingsApi.getProfile();
  },

  async updateProfile(data: UserProfileUpdateInput): Promise<User> {
    return await settingsApi.updateProfile(data);
  },

  async getNotificationSettings(): Promise<NotificationSettings> {
    return await settingsApi.getNotificationSettings();
  },

  async updateNotificationSettings(data: Partial<NotificationSettings>): Promise<NotificationSettings> {
    return await settingsApi.updateNotificationSettings(data);
  },

  async getTeamMembers(): Promise<TeamMember[]> {
    return await settingsApi.getTeamMembers();
  },

  async addTeamMember(member: Omit<TeamMember, 'id'>): Promise<TeamMember> {
    return await settingsApi.addTeamMember(member);
  },
};
