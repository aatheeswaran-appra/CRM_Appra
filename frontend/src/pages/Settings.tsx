import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Bell,
  Users,
  Eye,
  EyeOff,
  Check,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { PhoneInput } from '../components/common/PhoneInput';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { settingsService } from '../services/settingsService';
import type { User as UserType, NotificationSettings, TeamMember } from '../types/user';
import { Badge } from '../components/common/Badge';

export const Settings: React.FC = () => {
  const { user: authUser, updateCurrentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'team'>('profile');

  // Profile Form State
  const [profile, setProfile] = useState<Partial<UserType>>({
    name: authUser?.name || '',
    phone: authUser?.phone || '',
    email: authUser?.email || '',
  });

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Notifications State
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    emailAlerts: true,
    smsAlerts: false,
    whatsappAlerts: true,
    dailySummary: true,
    overdueReminders: true,
  });

  // Team Members State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [prof, notif, team] = await Promise.all([
        settingsService.getProfile().catch(() => authUser || null),
        settingsService.getNotificationSettings().catch(() => null),
        settingsService.getTeamMembers().catch(() => []),
      ]);

      if (prof) {
        setProfile({
          name: prof.name || '',
          phone: prof.phone || '',
          email: prof.email || '',
        });
      }
      if (notif) setNotifSettings(notif);
      setTeamMembers(team || []);
    } catch (err: any) {
      setApiError(err.message || 'Unable to fetch settings.');
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setIsSaving(true);
    try {
      const updated = await settingsService.updateProfile({
        name: profile.name,
        phone: profile.phone,
        email: profile.email,
        password: password || undefined,
      });

      updateCurrentUser(updated || profile);
      setToastMessage('Profile changes saved successfully!');
      setPassword('');
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err: any) {
      setApiError(err.response?.data?.message || err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNotif = async (key: keyof NotificationSettings) => {
    const updated = { ...notifSettings, [key]: !notifSettings[key] };
    setNotifSettings(updated);
    try {
      await settingsService.updateNotificationSettings(updated);
    } catch {
      // Revert if failed
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-[1200px] mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-in slide-in-from-top-3">
          <Check className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage your account and preferences.
        </p>
      </div>

      {/* Error State if overall settings fail */}
      {apiError && !loading && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Settings Navigation Sub-menu */}
        <div className="md:col-span-3 bg-white border border-slate-200/80 rounded-xl shadow-xs p-2 space-y-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-blue-50 text-blue-600 border border-blue-100/70'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-blue-50 text-blue-600 border border-blue-100/70'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'team'
                ? 'bg-blue-50 text-blue-600 border border-blue-100/70'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team Members</span>
          </button>
        </div>

        {/* Right Content Area */}
        <div className="md:col-span-9 bg-white border border-slate-200/80 rounded-xl shadow-xs p-6 sm:p-7">
          {/* TAB 1: Profile Settings */}
          {activeTab === 'profile' && (
            <div>
              {loading ? (
                <div className="space-y-6">
                  <div className="space-y-2 pb-4 border-b border-slate-100">
                    <Skeleton className="w-32 h-5" />
                    <Skeleton className="w-48 h-3.5" />
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="w-full h-10" />
                    <Skeleton className="w-full h-10" />
                    <Skeleton className="w-full h-10" />
                    <Skeleton className="w-full h-10" />
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="pb-4 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900">Profile Settings</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Update your personal information.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Name */}
                    <Input
                      label="Name"
                      requiredStar
                      placeholder="Enter your name"
                      value={profile.name || ''}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />

                    {/* Phone Number */}
                    <PhoneInput
                      label="Phone Number"
                      requiredStar
                      placeholder="Enter phone number"
                      value={profile.phone || ''}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    />

                    {/* Email */}
                    <Input
                      label="Email"
                      type="email"
                      placeholder="Enter your email address"
                      value={profile.email || ''}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />

                    {/* Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">New Password</label>
                      <div className="relative flex items-center">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Leave blank to keep existing password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-lg px-3.5 py-2.5 pr-10 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Right Save Button */}
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={isSaving}
                      className="px-5 text-xs font-semibold"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">Notification Preferences</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose how and when you receive CRM notifications.
                </p>
              </div>

              <div className="space-y-4 divide-y divide-slate-100">
                <div className="flex items-center justify-between pt-3">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">Email Alerts</h3>
                    <p className="text-[11px] text-slate-500">
                      Receive email summaries for upcoming follow-ups
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings.emailAlerts}
                    onChange={() => handleToggleNotif('emailAlerts')}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">WhatsApp Alerts</h3>
                    <p className="text-[11px] text-slate-500">
                      Send instantaneous WhatsApp notifications for new inquiries
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings.whatsappAlerts}
                    onChange={() => handleToggleNotif('whatsappAlerts')}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">Daily Summary</h3>
                    <p className="text-[11px] text-slate-500">
                      Receive morning recap of daily customer tasks
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings.dailySummary}
                    onChange={() => handleToggleNotif('dailySummary')}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">Overdue Reminders</h3>
                    <p className="text-[11px] text-slate-500">
                      Urgent notifications for overdue client follow-ups
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSettings.overdueReminders}
                    onChange={() => handleToggleNotif('overdueReminders')}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Team Members */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Team Members</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage team access and assigned CRM roles.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => alert('Add team member functionality will open invitation dialog.')}
                  className="text-xs"
                >
                  Add Member
                </Button>
              </div>

              {loading ? (
                <div className="space-y-3 py-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Skeleton variant="circular" className="w-8 h-8" />
                        <div className="space-y-1">
                          <Skeleton className="w-24 h-3.5" />
                          <Skeleton className="w-32 h-3" />
                        </div>
                      </div>
                      <Skeleton className="w-16 h-5" />
                    </div>
                  ))}
                </div>
              ) : teamMembers.length === 0 ? (
                <EmptyState
                  title="No team members added"
                  description="Invite team members to collaborate on customer leads and follow-ups."
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="py-3 flex items-center justify-between hover:bg-slate-50/60 px-2 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                          {member.initials || member.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900">{member.name}</h4>
                          <span className="text-[11px] text-slate-500">{member.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-600 font-medium">{member.role}</span>
                        <Badge
                          variant={member.status === 'Active' ? 'green' : 'gray'}
                          size="sm"
                        >
                          {member.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
