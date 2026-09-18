import { apiClient } from './client';
import type {
  DashboardStats,
  ReportStats,
  LeadGrowthDataPoint,
  LeadSourceDataPoint,
  StatusBreakdownDataPoint,
  TopRequirementDataPoint,
  FollowUpPerformanceData,
  ReportHighlight,
} from '../types/report';

export const reportApi = {
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/reports/dashboard-stats');
    return response.data;
  },

  async getReportStats(timeframe = 'This Month'): Promise<ReportStats> {
    const response = await apiClient.get<ReportStats>('/reports/stats', {
      params: { timeframe },
    });
    return response.data;
  },

  async getLeadGrowth(timeframe = 'This Month'): Promise<LeadGrowthDataPoint[]> {
    const response = await apiClient.get<LeadGrowthDataPoint[]>('/reports/lead-growth', {
      params: { timeframe },
    });
    return response.data;
  },

  async getLeadSources(timeframe = 'This Month'): Promise<LeadSourceDataPoint[]> {
    const response = await apiClient.get<LeadSourceDataPoint[]>('/reports/lead-sources', {
      params: { timeframe },
    });
    return response.data;
  },

  async getStatusBreakdown(): Promise<StatusBreakdownDataPoint[]> {
    const response = await apiClient.get<StatusBreakdownDataPoint[]>('/reports/status-breakdown');
    return response.data;
  },

  async getTopRequirements(): Promise<TopRequirementDataPoint[]> {
    const response = await apiClient.get<TopRequirementDataPoint[]>('/reports/top-requirements');
    return response.data;
  },

  async getFollowUpPerformance(): Promise<FollowUpPerformanceData> {
    const response = await apiClient.get<FollowUpPerformanceData>('/reports/followup-performance');
    return response.data;
  },

  async getReportHighlights(): Promise<ReportHighlight[]> {
    const response = await apiClient.get<ReportHighlight[]>('/reports/highlights');
    return response.data;
  },
};
