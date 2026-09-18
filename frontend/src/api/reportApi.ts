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

const SOURCE_COLORS: Record<string, string> = {
  Website: '#3b82f6',
  WhatsApp: '#10b981',
  Referral: '#8b5cf6',
  Instagram: '#f59e0b',
  Call: '#ec4899',
  Other: '#64748b',
};

const STATUS_COLORS: Record<string, string> = {
  New: '#3b82f6',
  Contacted: '#0ea5e9',
  Interested: '#10b981',
  'Follow-up': '#f59e0b',
  Closed: '#059669',
  'Not Interested': '#64748b',
};

const SOURCE_NAME_MAP: Record<string, string> = {
  WEBSITE: 'Website',
  WHATSAPP: 'WhatsApp',
  REFERRAL: 'Referral',
  INSTAGRAM: 'Instagram',
  CALL: 'Call',
  OTHER: 'Other',
};

const STATUS_NAME_MAP: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  INTERESTED: 'Interested',
  FOLLOW_UP: 'Follow-up',
  CLOSED: 'Closed',
  NOT_INTERESTED: 'Not Interested',
};

function getDateRangeForTimeframe(timeframe: string): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  if (timeframe === 'Last Month') {
    const prevMonthDate = new Date(year, month - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();
    const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
    return {
      from: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`,
      to: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    };
  }

  if (timeframe === 'This Year') {
    const today = now.toISOString().slice(0, 10);
    return {
      from: `${year}-01-01`,
      to: today,
    };
  }

  // Default: 'This Month'
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    from: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    to: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

let reportCache: { key: string; promise: Promise<any> } | null = null;

async function fetchFullReport(timeframe = 'This Month'): Promise<any> {
  const { from, to } = getDateRangeForTimeframe(timeframe);
  const cacheKey = `${from}_${to}`;

  if (reportCache && reportCache.key === cacheKey) {
    return reportCache.promise;
  }

  const promise = apiClient
    .get('/reports', { params: { from, to } })
    .then((res) => res.data?.data || res.data)
    .catch((err) => {
      reportCache = null;
      throw err;
    });

  reportCache = { key: cacheKey, promise };
  // Reset cache after 2 seconds
  setTimeout(() => {
    if (reportCache?.key === cacheKey) reportCache = null;
  }, 2000);

  return promise;
}

export const reportApi = {
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get('/dashboard');
    const raw = response.data?.data || response.data;
    const stats = raw.stats || {};
    return {
      totalCustomers: stats.totalCustomers ?? 0,
      totalCustomersGrowth: stats.totalCustomersChange ?? 0,
      followUpsToday: stats.followUpsToday ?? 0,
      overdueFollowUps: stats.overdueFollowUps ?? 0,
      closedCount: stats.closedCustomers ?? 0,
      closedGrowth: stats.closedCustomersChange ?? 0,
    };
  },

  async getReportStats(timeframe = 'This Month'): Promise<ReportStats> {
    const data = await fetchFullReport(timeframe);
    const s = data.summary || {};
    return {
      totalLeads: s.totalLeads ?? 0,
      totalLeadsGrowth: s.totalLeadsChange ?? 0,
      interestedLeads: s.interestedLeads ?? 0,
      interestedLeadsGrowth: s.interestedLeadsChange ?? 0,
      conversionRate: s.conversionRate ?? 0,
      conversionRateGrowth: s.conversionRateChange ?? 0,
      followUpCompletionRate: s.followUpCompletionRate ?? 0,
      followUpCompletionRateGrowth: s.followUpCompletionRateChange ?? 0,
    };
  },

  async getLeadGrowth(timeframe = 'This Month'): Promise<LeadGrowthDataPoint[]> {
    const data = await fetchFullReport(timeframe);
    const growth = data.leadGrowth || [];
    return growth.map((item: any) => ({
      week: item.label,
      leads: item.count,
    }));
  },

  async getLeadSources(timeframe = 'This Month'): Promise<LeadSourceDataPoint[]> {
    const data = await fetchFullReport(timeframe);
    const sources = data.leadSources || [];
    return sources.map((item: any) => {
      const name = SOURCE_NAME_MAP[item.source] || item.source;
      return {
        name,
        value: item.count,
        percentage: item.percentage,
        color: SOURCE_COLORS[name] || '#64748b',
      };
    });
  },

  async getStatusBreakdown(timeframe = 'This Month'): Promise<StatusBreakdownDataPoint[]> {
    const data = await fetchFullReport(timeframe);
    const breakdown = data.statusBreakdown || [];
    return breakdown.map((item: any) => {
      const status = STATUS_NAME_MAP[item.status] || item.status;
      return {
        status,
        count: item.count,
        color: STATUS_COLORS[status] || '#64748b',
      };
    });
  },

  async getTopRequirements(timeframe = 'This Month'): Promise<TopRequirementDataPoint[]> {
    const data = await fetchFullReport(timeframe);
    const reqs = data.topRequirements || [];
    return reqs.map((item: any) => ({
      requirement: item.requirement,
      leads: item.count,
    }));
  },

  async getFollowUpPerformance(timeframe = 'This Month'): Promise<FollowUpPerformanceData> {
    const data = await fetchFullReport(timeframe);
    const p = data.followUpPerformance || {};
    return {
      completedToday: p.completedToday ?? 0,
      upcoming: p.upcoming ?? 0,
      overdue: p.overdue ?? 0,
      rescheduled: p.rescheduled ?? 0,
      responseRate: p.completionRate ?? 0,
    };
  },

  async getReportHighlights(timeframe = 'This Month'): Promise<ReportHighlight[]> {
    const data = await fetchFullReport(timeframe);
    const highlights = data.highlights || [];
    return highlights.map((h: any, idx: number) => ({
      id: `high_${idx}`,
      type: h.metric || 'growth',
      title: h.metric ? h.metric.replace(/_/g, ' ').toUpperCase() : 'Metric',
      highlightText: `${h.change >= 0 ? '+' : ''}${h.change}%`,
      subtext: h.message,
    }));
  },

  async exportReport(format: 'csv' | 'xlsx' = 'xlsx', timeframe = 'This Month'): Promise<Blob> {
    const { from, to } = getDateRangeForTimeframe(timeframe);
    const response = await apiClient.get('/reports/export', {
      params: { from, to, format },
      responseType: 'blob',
    });
    return response.data;
  },
};
