export interface UserProfile {
  name: string;
  phone: string;
  email: string;
  role: string;
  avatarInitials: string;
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
  role: 'Admin' | 'Sales Executive' | 'Manager';
  status: 'Active' | 'Inactive';
  initials: string;
}
