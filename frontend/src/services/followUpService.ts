import { followUpApi } from '../api/followUpApi';
import type { FollowUpItem, CreateFollowUpInput } from '../types/followUp';

export const followUpService = {
  async getFollowUps(params?: { filter?: 'today' | 'overdue' | 'all'; date?: string }): Promise<FollowUpItem[]> {
    return await followUpApi.getFollowUps(params);
  },

  async getTodayFollowUps(): Promise<FollowUpItem[]> {
    return await followUpApi.getTodayFollowUps();
  },

  async getOverdueFollowUps(): Promise<FollowUpItem[]> {
    return await followUpApi.getOverdueFollowUps();
  },

  async getAllFollowUps(): Promise<{ today: FollowUpItem[]; overdue: FollowUpItem[] }> {
    try {
      const [today, overdue] = await Promise.all([
        followUpApi.getTodayFollowUps(),
        followUpApi.getOverdueFollowUps(),
      ]);
      return { today, overdue };
    } catch {
      // If separate endpoints aren't present, try general endpoint
      const all = await followUpApi.getFollowUps();
      return {
        today: all.filter((f) => !f.isOverdue),
        overdue: all.filter((f) => f.isOverdue),
      };
    }
  },

  async createFollowUp(input: CreateFollowUpInput): Promise<FollowUpItem> {
    return await followUpApi.createFollowUp(input);
  },

  async updateFollowUpStatus(id: string, status: string): Promise<FollowUpItem> {
    return await followUpApi.updateFollowUpStatus(id, status);
  },

  async deleteFollowUp(id: string): Promise<boolean> {
    const res = await followUpApi.deleteFollowUp(id);
    return res.success;
  },
};
