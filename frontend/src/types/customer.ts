export type LeadSource = 'Website' | 'WhatsApp' | 'Referral' | 'Instagram' | 'Call' | 'Other';
export type PreferredContact = 'WhatsApp' | 'Call' | 'Either';
export type CustomerStatus = 'New' | 'Contacted' | 'Interested' | 'Follow-up' | 'Closed' | 'Not Interested';

export interface Customer {
  id: string;
  name: string;
  initials?: string;
  phone: string;
  requirement: string;
  source?: LeadSource | string;
  location?: string;
  notes?: string;
  status: CustomerStatus | string;
  createdAt: string;
  relativeTime?: string;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  preferredContact?: PreferredContact | string;
  avatarColor?: string;
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  requirement: string;
  source?: LeadSource | string;
  location?: string;
  notes?: string;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  preferredContact?: PreferredContact | string;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  status?: CustomerStatus | string;
}
