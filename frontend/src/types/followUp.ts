export type FollowUpStatus = 'Due Today' | 'Overdue' | 'Upcoming' | 'Completed' | 'Rescheduled';

export interface FollowUpItem {
  id: string;
  time: string;
  date: string;
  customerId?: string;
  customerName: string;
  customerInitials?: string;
  requirement: string;
  phone: string;
  status: FollowUpStatus | string;
  isOverdue?: boolean;
  avatarColor?: string;
  preferredContact?: 'WhatsApp' | 'Call' | 'Either' | string;
}

export interface CreateFollowUpInput {
  time: string;
  date: string;
  customerId?: string;
  customerName: string;
  requirement: string;
  phone: string;
  status?: FollowUpStatus | string;
  preferredContact?: 'WhatsApp' | 'Call' | 'Either' | string;
}
