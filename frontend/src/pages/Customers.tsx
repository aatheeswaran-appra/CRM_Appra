import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Calendar,
  Clock,
  Plus,
  Check,
  CalendarDays,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { PhoneInput } from '../components/common/PhoneInput';
import { Textarea } from '../components/common/Textarea';
import { Select } from '../components/common/Select';
import { customerService } from '../services/customerService';
import { CustomerList } from '../components/customers/CustomerList';
import { customerErrorMessage, customerSources, validateCustomer } from '../utils/customerForm';
import type { CreateCustomerInput, LeadSource, PreferredContact } from '../types/customer';

export const Customers: React.FC = () => {
  const navigate = useNavigate();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [listVersion, setListVersion] = useState(0);

  // Form State
  const [formData, setFormData] = useState<CreateCustomerInput>({
    name: '',
    phone: '',
    requirement: '',
    source: '',
    location: '',
    notes: '',
    nextFollowUpDate: '',
    nextFollowUpTime: '',
    preferredContact: 'WhatsApp',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const handleInputChange = (
    field: keyof CreateCustomerInput,
    value: string | LeadSource | PreferredContact
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const newErrors = validateCustomer(formData);

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setApiError(null);
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const savedCustomer = await customerService.createCustomer({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        requirement: formData.requirement.trim(),
        source: formData.source || undefined,
        location: formData.location?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        nextFollowUpDate: formData.nextFollowUpDate || undefined,
        nextFollowUpTime: formData.nextFollowUpTime || undefined,
        preferredContact: formData.preferredContact,
      });

      // Customer creation also schedules its initial follow-up atomically.
      setListVersion((version) => version + 1);

      setToastMessage(`Customer "${savedCustomer.name}" saved successfully!`);

      // Reset form
      setFormData({
        name: '',
        phone: '',
        requirement: '',
        source: '',
        location: '',
        notes: '',
        nextFollowUpDate: '',
        nextFollowUpTime: '',
        preferredContact: 'WhatsApp',
      });

    } catch (err: unknown) {
      const msg = customerErrorMessage(err, 'Unable to save customer. Please try again.');
      setApiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-[1000px] mx-auto space-y-6">
      {/* Toast feedback */}
      {toastMessage && (
        <div role="status" className="fixed top-5 right-5 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-in slide-in-from-top-3">
          <Check className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Customers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Add new customers and manage their details below.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleCancel}
            className="text-xs font-semibold px-4"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            form="create-customer-form"
            loading={isSubmitting}
            className="text-xs font-semibold px-4"
          >
            {isSubmitting ? 'Saving...' : 'Save Customer'}
          </Button>
        </div>
      </div>

      {/* API Error Alert */}
      {apiError && (
        <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Main Form Container Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs p-6 sm:p-8 space-y-8">
        <form id="create-customer-form" onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION 1: Basic Details */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <User className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Basic Details</h2>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <Input
                label="Name"
                ref={nameInputRef}
                maxLength={120}
                requiredStar
                placeholder="Enter customer name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={errors.name}
              />

              {/* Phone Number */}
              <PhoneInput
                label="Phone Number"
                maxLength={32}
                requiredStar
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                error={errors.phone}
              />

              {/* Requirement */}
              <Textarea
                label="Requirement"
                maxLength={500}
                requiredStar
                rows={3}
                placeholder="Enter requirement (e.g. Website, Digital Marketing, etc.)"
                value={formData.requirement}
                onChange={(e) => handleInputChange('requirement', e.target.value)}
                error={errors.requirement}
              />

              {/* Source & Location (2 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Source"
                  placeholder="Select source"
                  options={customerSources}
                  value={formData.source || ''}
                  onChange={(e) => handleInputChange('source', e.target.value as LeadSource)}
                />

                <Input
                  label="Location"
                  maxLength={200}
                  placeholder="Enter location (optional)"
                  value={formData.location || ''}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                />
              </div>

              {/* Notes */}
              <Textarea
                label="Notes"
                maxLength={10000}
                rows={3}
                placeholder="Any additional notes (optional)"
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>
          </div>

          {/* SECTION 2: Follow-up Details */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Follow-up Details</h2>
            </div>

            <div className="space-y-4">
              {/* Next Follow-up Date & Time (2 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Next Follow-up Date"
                  rightIcon={<CalendarDays className="w-4 h-4 text-slate-400 pointer-events-none" />}
                  value={formData.nextFollowUpDate || ''}
                  onChange={(e) => handleInputChange('nextFollowUpDate', e.target.value)}
                  error={errors.nextFollowUpDate}
                />

                <Input
                  type="time"
                  label="Next Follow-up Time"
                  rightIcon={<Clock className="w-4 h-4 text-slate-400 pointer-events-none" />}
                  value={formData.nextFollowUpTime || ''}
                  onChange={(e) => handleInputChange('nextFollowUpTime', e.target.value)}
                  error={errors.nextFollowUpTime}
                />
              </div>

              {/* Preferred Contact Radio Options */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-slate-700">
                  Preferred Contact
                </label>
                <div className="flex items-center gap-6 pt-1">
                  {(['WhatsApp', 'Call', 'Either'] as PreferredContact[]).map((mode) => (
                    <label
                      key={mode}
                      className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none"
                    >
                      <input
                        type="radio"
                        name="preferredContact"
                        value={mode}
                        checked={formData.preferredContact === mode}
                        onChange={() => handleInputChange('preferredContact', mode)}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{mode}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <CustomerList
        key={listVersion}
        onAdd={() => nameInputRef.current?.focus()}
        onFeedback={setToastMessage}
      />
    </div>
  );
};
