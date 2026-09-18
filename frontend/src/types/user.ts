export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  avatarInitials?: string;
  createdAt?: string;
}

export interface UserProfileUpdateInput {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
}

export interface NotificationSettings {
  emailAlerts: boolean;
  smsAlerts: boolean;
  whatsappAlerts: boolean;
  dailySummary: boolean;
  overdueReminders: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
  initials: string;
}
