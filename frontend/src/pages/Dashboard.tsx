import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  CalendarDays,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
import { StatCardSkeleton, Skeleton } from '../components/common/Skeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { customerService } from '../services/customerService';
import { followUpService } from '../services/followUpService';
import { reportService } from '../services/reportService';
import type { Customer } from '../types/customer';
import type { FollowUpItem } from '../types/followUp';
import type { DashboardStats } from '../types/report';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [todayFollowUps, setTodayFollowUps] = useState<FollowUpItem[]>([]);
  const [overdueFollowUps, setOverdueFollowUps] = useState<FollowUpItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashStats, customers, followUps] = await Promise.all([
        reportService.getDashboardStats().catch(() => null),
        customerService.getCustomers().catch(() => []),
        followUpService.getAllFollowUps().catch(() => ({ today: [], overdue: [] })),
      ]);

      setStats(dashStats);
      setRecentCustomers(customers ? customers.slice(0, 5) : []);
      setTodayFollowUps(followUps?.today ? followUps.today.slice(0, 4) : []);
      setOverdueFollowUps(followUps?.overdue ? followUps.overdue.slice(0, 3) : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Dynamic formatted date
  const currentDateFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const userName = user?.name ? user.name.split(' ')[0] : 'User';

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-[1400px] mx-auto space-y-6">
      {/* Top Header Greeting & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {getGreeting()}, {userName}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Here&apos;s your CRM overview.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white border border-slate-200/80 px-3 py-1.5 rounded-lg shadow-2xs self-start sm:self-auto">
          <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentDateFormatted}</span>
        </div>
      </div>

      {/* Global Error Banner if entire page fails */}
      {error && !loading && (
        <ErrorState
          title="Dashboard unavailable"
          message={error}
          onRetry={loadDashboardData}
          className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs"
        />
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            {/* 1. Total Customers */}
            <StatCard
              title="Total Customers"
              value={stats?.totalCustomers ?? 0}
              icon={<Users className="w-5 h-5" />}
              variant="blue"
              growthText={
                stats?.totalCustomersGrowth !== undefined
                  ? `${stats.totalCustomersGrowth >= 0 ? '+' : ''}${stats.totalCustomersGrowth}% vs last month`
                  : undefined
              }
              growthType={
                stats?.totalCustomersGrowth !== undefined && stats.totalCustomersGrowth >= 0
                  ? 'positive'
                  : 'negative'
              }
            />

            {/* 2. Follow-ups Today */}
            <StatCard
              title="Follow-ups Today"
              value={stats?.followUpsToday ?? todayFollowUps.length}
              icon={<Calendar className="w-5 h-5" />}
              variant="blue"
            />

            {/* 3. Overdue Follow-ups */}
            <StatCard
              title="Overdue Follow-ups"
              value={stats?.overdueFollowUps ?? overdueFollowUps.length}
              icon={<AlertTriangle className="w-5 h-5" />}
              variant="red"
            />

            {/* 4. Closed */}
            <StatCard
              title="Closed"
              value={stats?.closedCount ?? 0}
              icon={<CheckCircle2 className="w-5 h-5" />}
              variant="green"
              growthText={
                stats?.closedGrowth !== undefined
                  ? `${stats.closedGrowth >= 0 ? '+' : ''}${stats.closedGrowth}% this month`
                  : undefined
              }
              growthType={
                stats?.closedGrowth !== undefined && stats.closedGrowth >= 0
                  ? 'positive'
                  : 'negative'
              }
            />
          </>
        )}
      </div>

      {/* Two-Column Section: Recent Customers & Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Recent Customers */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Recent Customers</h2>
              </div>
              <button
                onClick={() => navigate('/customers')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content / Loading / Empty */}
            {loading ? (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton variant="circular" className="w-9 h-9" />
                      <div className="space-y-1.5">
                        <Skeleton className="w-24 h-3.5" />
                        <Skeleton className="w-32 h-3" />
                      </div>
                    </div>
                    <Skeleton className="w-16 h-3" />
                  </div>
                ))}
              </div>
            ) : recentCustomers.length === 0 ? (
              <EmptyState
                icon={<UserPlus className="w-6 h-6 text-slate-400" />}
                title="No customers added yet"
                description="Your recent customer records will appear here as soon as they are added."
                actionText="+ Add Customer"
                onAction={() => navigate('/customers')}
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => navigate('/customers')}
                    className="py-3.5 flex items-center justify-between hover:bg-slate-50/80 rounded-lg px-2 -mx-2 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-9 h-9 rounded-full ${
                          customer.avatarColor || 'bg-blue-100 text-blue-700'
                        } text-xs font-bold flex items-center justify-center shrink-0`}
                      >
                        {customer.initials || customer.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <h3 className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {customer.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">{customer.requirement}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {customer.relativeTime && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          {customer.relativeTime}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Follow-ups Today & Overdue Follow-ups */}
        <div className="lg:col-span-6 space-y-6">
          {/* Card 1: Follow-ups Today */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden p-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Follow-ups Today</h2>
              </div>
              <button
                onClick={() => navigate('/follow-ups')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="py-3 flex items-center justify-between">
                    <Skeleton className="w-20 h-4" />
                    <Skeleton className="w-28 h-4" />
                  </div>
                ))}
              </div>
            ) : todayFollowUps.length === 0 ? (
              <EmptyState
                title="No follow-ups for today"
                description="You are all caught up on your scheduled follow-ups."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {todayFollowUps.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate('/follow-ups')}
                    className="py-3 flex items-center justify-between hover:bg-slate-50/80 rounded-lg px-2 -mx-2 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-900 w-16">
                        {item.time}
                      </span>
                      <span className="text-xs font-medium text-slate-700">
                        {item.customerName}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Overdue Follow-ups */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden p-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h2 className="text-sm font-bold text-slate-900">Overdue Follow-ups</h2>
              </div>
              <button
                onClick={() => navigate('/follow-ups')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="py-3 flex items-center justify-between">
                    <Skeleton className="w-28 h-4" />
                    <Skeleton className="w-24 h-4" />
                  </div>
                ))}
              </div>
            ) : overdueFollowUps.length === 0 ? (
              <EmptyState
                title="No overdue follow-ups"
                description="Great job! You have no overdue customer follow-ups."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {overdueFollowUps.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate('/follow-ups')}
                    className="py-3 flex items-center justify-between hover:bg-slate-50/80 rounded-lg px-2 -mx-2 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-rose-600 min-w-[120px]">
                        {item.time}
                      </span>
                      <span className="text-xs font-medium text-slate-700">
                        {item.customerName}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
