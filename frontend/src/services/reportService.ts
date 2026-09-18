import { reportApi } from '../api/reportApi';
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

export const reportService = {
  async getDashboardStats(): Promise<DashboardStats> {
    return await reportApi.getDashboardStats();
  },

  async getReportStats(timeframe = 'This Month'): Promise<ReportStats> {
    return await reportApi.getReportStats(timeframe);
  },

  async getLeadGrowth(timeframe = 'This Month'): Promise<LeadGrowthDataPoint[]> {
    return await reportApi.getLeadGrowth(timeframe);
  },

  async getLeadSources(timeframe = 'This Month'): Promise<LeadSourceDataPoint[]> {
    return await reportApi.getLeadSources(timeframe);
  },

  async getStatusBreakdown(): Promise<StatusBreakdownDataPoint[]> {
    return await reportApi.getStatusBreakdown();
  },

  async getTopRequirements(): Promise<TopRequirementDataPoint[]> {
    return await reportApi.getTopRequirements();
  },

  async getFollowUpPerformance(): Promise<FollowUpPerformanceData> {
    return await reportApi.getFollowUpPerformance();
  },

  async getReportHighlights(): Promise<ReportHighlight[]> {
    return await reportApi.getReportHighlights();
  },
};
