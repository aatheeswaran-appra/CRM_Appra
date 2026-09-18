export interface DashboardStats {
  totalCustomers: number;
  totalCustomersGrowth?: number;
  followUpsToday: number;
  overdueFollowUps: number;
  closedCount: number;
  closedGrowth?: number;
}

export interface LeadGrowthDataPoint {
  week: string;
  leads: number;
}

export interface LeadSourceDataPoint {
  name: string;
  value: number;
  percentage: number;
  color?: string;
}

export interface StatusBreakdownDataPoint {
  status: string;
  count: number;
  color?: string;
}

export interface TopRequirementDataPoint {
  requirement: string;
  leads: number;
}

export interface FollowUpPerformanceData {
  completedToday: number;
  upcoming: number;
  overdue: number;
  rescheduled: number;
  responseRate: number;
}

export interface ReportHighlight {
  id: string;
  type: 'growth' | 'whatsapp' | 'conversion' | 'completion' | string;
  title: string;
  highlightText: string;
  subtext: string;
  bgClass?: string;
  borderClass?: string;
  textClass?: string;
  iconBgClass?: string;
}

export interface ReportStats {
  totalLeads: number;
  totalLeadsGrowth?: number;
  interestedLeads: number;
  interestedLeadsGrowth?: number;
  conversionRate: number;
  conversionRateGrowth?: number;
  followUpCompletionRate: number;
  followUpCompletionRateGrowth?: number;
}
