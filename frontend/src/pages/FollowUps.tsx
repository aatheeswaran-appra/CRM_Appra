import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  Phone,
  MessageCircle,
  Check,
  ChevronDown,
  PhoneCall,
  ExternalLink,
} from 'lucide-react';
import { followUpService } from '../services/followUpService';
import type { FollowUpItem } from '../types/followUp';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { TableRowSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';

export const FollowUps: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'today' | 'overdue'>('today');
  const [todayFollowUps, setTodayFollowUps] = useState<FollowUpItem[]>([]);
  const [overdueFollowUps, setOverdueFollowUps] = useState<FollowUpItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action Modal State
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'whatsapp' | 'call';
    item?: FollowUpItem;
  }>({ isOpen: false, type: 'whatsapp' });

  const loadFollowUps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await followUpService.getAllFollowUps();
      setTodayFollowUps(data?.today || []);
      setOverdueFollowUps(data?.overdue || []);
    } catch (err: any) {
      setError(err.message || 'Unable to load follow-ups.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  const currentList = activeTab === 'today' ? todayFollowUps : overdueFollowUps;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(currentList.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleWhatsAppAction = (item: FollowUpItem) => {
    setActionModal({ isOpen: true, type: 'whatsapp', item });
  };

  const handleCallAction = (item: FollowUpItem) => {
    setActionModal({ isOpen: true, type: 'call', item });
  };

  const handleMarkSelectedCompleted = async () => {
    try {
      for (const id of selectedIds) {
        await followUpService.updateFollowUpStatus(id, 'Completed');
      }
      await loadFollowUps();
      setSelectedIds([]);
    } catch {
      // Error handling
    }
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-[1400px] mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Follow-ups
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Stay on top of your conversations. Never miss an opportunity.
          </p>
        </div>

        {/* Date Selector Dropdown */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 px-3.5 py-2 rounded-lg shadow-2xs cursor-pointer hover:bg-slate-50 self-start sm:self-auto transition-colors">
          <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
          <span>{currentDateFormatted}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        {/* Tabs & Bulk Action Header */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-200/80">
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                setActiveTab('today');
                setSelectedIds([]);
              }}
              className={`pb-3 text-xs font-bold transition-all relative select-none cursor-pointer ${
                activeTab === 'today'
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Today ({loading ? '...' : todayFollowUps.length})
              {activeTab === 'today' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('overdue');
                setSelectedIds([]);
              }}
              className={`pb-3 text-xs font-bold transition-all relative select-none cursor-pointer ${
                activeTab === 'overdue'
                  ? 'text-rose-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Overdue ({loading ? '...' : overdueFollowUps.length})
              {activeTab === 'overdue' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-t" />
              )}
            </button>
          </div>

          {/* Bulk actions if selected */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 pb-2">
              <span className="text-xs text-slate-500">{selectedIds.length} selected</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkSelectedCompleted}
                className="text-xs"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" /> Mark Done
              </Button>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && !loading ? (
          <ErrorState
            title="Failed to load follow-ups"
            message={error}
            onRetry={loadFollowUps}
            className="py-12"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-semibold">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      disabled={loading || currentList.length === 0}
                      checked={
                        currentList.length > 0 &&
                        selectedIds.length === currentList.length
                      }
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer disabled:opacity-40"
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold text-slate-600">Time</th>
                  <th className="py-3 px-4 font-semibold text-slate-600">Customer</th>
                  <th className="py-3 px-4 font-semibold text-slate-600">Requirement</th>
                  <th className="py-3 px-4 font-semibold text-slate-600">Status</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 text-right pr-6">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRowSkeleton key={i} columns={6} />
                  ))
                ) : currentList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12">
                      <EmptyState
                        title={
                          activeTab === 'today'
                            ? 'No follow-ups for today'
                            : 'No overdue follow-ups'
                        }
                        description={
                          activeTab === 'today'
                            ? 'All upcoming customer follow-ups will appear here.'
                            : 'No follow-ups are currently overdue.'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  currentList.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          isSelected ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.id)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Time */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`font-semibold ${
                              item.isOverdue ? 'text-rose-600' : 'text-slate-900'
                            }`}
                          >
                            {item.time}
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-7 h-7 rounded-full ${
                                item.avatarColor || 'bg-blue-100 text-blue-700'
                              } text-[11px] font-bold flex items-center justify-center shrink-0`}
                            >
                              {item.customerInitials || item.customerName.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {item.customerName}
                            </span>
                          </div>
                        </td>

                        {/* Requirement */}
                        <td className="py-3.5 px-4 text-slate-600">
                          {item.requirement}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          {item.isOverdue ? (
                            <Badge variant="red" size="sm">
                              Overdue
                            </Badge>
                          ) : (
                            <Badge variant="blue" size="sm">
                              Due Today
                            </Badge>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right pr-6">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="whatsapp"
                              onClick={() => handleWhatsAppAction(item)}
                              icon={<MessageCircle className="w-3.5 h-3.5 fill-white/20" />}
                              className="px-2.5 py-1 text-[11px] font-medium"
                            >
                              WhatsApp
                            </Button>

                            <Button
                              size="sm"
                              variant="call"
                              onClick={() => handleCallAction(item)}
                              icon={<Phone className="w-3.5 h-3.5 fill-white/20" />}
                              className="px-3 py-1 text-[11px] font-medium"
                            >
                              Call
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interaction Modal for WhatsApp / Call */}
      {actionModal.isOpen && actionModal.item && (
        <Modal
          isOpen={actionModal.isOpen}
          onClose={() => setActionModal({ isOpen: false, type: 'whatsapp' })}
          title={
            actionModal.type === 'whatsapp'
              ? `Send WhatsApp to ${actionModal.item.customerName}`
              : `Call ${actionModal.item.customerName}`
          }
          subtitle={`Phone: +91 ${actionModal.item.phone} • ${actionModal.item.requirement}`}
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionModal({ isOpen: false, type: 'whatsapp' })}
              >
                Close
              </Button>
              {actionModal.type === 'whatsapp' ? (
                <a
                  href={`https://wa.me/91${actionModal.item.phone.replace(/\s+/g, '')}?text=Hello%20${encodeURIComponent(
                    actionModal.item.customerName
                  )},%20following%20up%20regarding%20your%20requirement%20for%20${encodeURIComponent(
                    actionModal.item.requirement
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open WhatsApp Web
                </a>
              ) : (
                <a
                  href={`tel:+91${actionModal.item.phone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Start Call (+91 {actionModal.item.phone})
                </a>
              )}
            </>
          }
        >
          <div className="space-y-3 text-xs text-slate-700">
            {actionModal.type === 'whatsapp' ? (
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg space-y-2">
                <p className="font-semibold text-emerald-900">Message Context:</p>
                <p className="text-emerald-800 italic bg-white p-2.5 rounded border border-emerald-200">
                  &ldquo;Hello {actionModal.item.customerName}, following up regarding your enquiry for {actionModal.item.requirement}. How can we assist you today?&rdquo;
                </p>
              </div>
            ) : (
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg space-y-2">
                <p className="font-semibold text-blue-900">Calling Details:</p>
                <p className="text-blue-800">
                  Direct Line: <strong className="font-semibold">+91 {actionModal.item.phone}</strong>
                </p>
                <p className="text-slate-600">Requirement: {actionModal.item.requirement}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
