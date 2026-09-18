import { useEffect, useState } from 'react';
import { Eye, Pencil, Plus, RefreshCw, Search, Trash2, Users } from 'lucide-react';
import { Badge, type BadgeProps } from '../common/Badge';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { Select } from '../common/Select';
import { Textarea } from '../common/Textarea';
import { customerService } from '../../services/customerService';
import type { Customer, CustomerListQuery, CustomerPage, UpdateCustomerInput } from '../../types/customer';
import { customerErrorMessage, customerSources, customerStatuses, validateCustomer } from '../../utils/customerForm';

type CustomerEditor = Required<Pick<UpdateCustomerInput, 'name' | 'phone' | 'requirement' | 'source' | 'location' | 'notes' | 'status'>>;
type CustomerAction = { type: 'view' | 'edit' | 'delete'; customer: Customer };

const statusColors: Record<string, BadgeProps['variant']> = {
  New: 'blue', Contacted: 'purple', Interested: 'green', 'Follow-up': 'orange', Closed: 'green', 'Not Interested': 'gray',
};

function formatDate(value?: string) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function CustomerList({ onAdd, onFeedback }: { onAdd: () => void; onFeedback: (message: string) => void }) {
  const [query, setQuery] = useState<CustomerListQuery>({ page: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<CustomerPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [action, setAction] = useState<CustomerAction | null>(null);
  const [draft, setDraft] = useState<CustomerEditor | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    customerService.getCustomerPage(query).then((page) => {
      if (!active) return;
      const lastPage = Math.max(1, page.pagination.totalPages);
      // A deletion or another user's changes can leave the current page empty.
      if (query.page > lastPage) {
        setQuery((current) => ({ ...current, page: lastPage }));
        return;
      }
      setResult(page);
      setIsLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      setListError(customerErrorMessage(error, 'Unable to load customers. Please try again.'));
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [query, refreshVersion]);

  const changeQuery = (next: React.SetStateAction<CustomerListQuery>) => {
    setIsLoading(true);
    setListError(null);
    setQuery(next);
  };

  const refreshCustomers = () => {
    setIsLoading(true);
    setListError(null);
    setRefreshVersion((version) => version + 1);
  };

  const openAction = (type: CustomerAction['type'], customer: Customer) => {
    setAction({ type, customer });
    setActionError(null);
    setErrors({});
    setDraft({
      name: customer.name, phone: customer.phone, requirement: customer.requirement,
      source: customer.source || 'Other', location: customer.location || '',
      notes: customer.notes || '', status: customer.status,
    });
  };

  const closeAction = () => {
    if (!isSaving) setAction(null);
  };

  const updateDraft = (field: keyof CustomerEditor, value: string) => {
    setDraft((current) => current ? { ...current, [field]: value } : current);
    setErrors((current) => ({ ...current, [field]: '' }));
    setActionError(null);
  };

  const saveCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!action || !draft || isSaving) return;
    const validationErrors = validateCustomer(draft);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const saved = await customerService.updateCustomer(action.customer.id, draft);
      setAction(null);
      refreshCustomers();
      onFeedback(`Customer "${saved.name}" updated successfully!`);
    } catch (error: unknown) {
      setActionError(customerErrorMessage(error, 'Unable to update customer. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCustomer = async () => {
    if (!action || isSaving) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const deleted = await customerService.deleteCustomer(action.customer.id);
      if (!deleted) throw new Error('Unable to delete customer. Please try again.');
      setAction(null);
      refreshCustomers();
      onFeedback(`Customer "${action.customer.name}" deleted successfully.`);
    } catch (error: unknown) {
      setActionError(customerErrorMessage(error, 'Unable to delete customer. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = Boolean(query.search || query.status);

  return (
    <section aria-labelledby="customer-list-heading" className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h2 id="customer-list-heading" className="text-base font-bold text-slate-900">All Customers</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">Browse customer details, update records, and manage your customer list.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} disabled={isLoading} onClick={refreshCustomers}>Refresh</Button>
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={onAdd}>Add Customer</Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <form className="flex flex-1 gap-2 items-end" onSubmit={(event) => {
            event.preventDefault();
            changeQuery((current) => ({ ...current, search: search.trim(), page: 1 }));
          }}>
            <Input id="customer-search" label="Search customers" placeholder="Name, phone, or requirement" maxLength={200} value={search} onChange={(event) => setSearch(event.target.value)} leftIcon={<Search className="w-4 h-4" />} />
            <Button type="submit" variant="outline" className="h-[42px]">Search</Button>
          </form>
          <div className="sm:w-44">
            <Select id="customer-status-filter" label="Filter by status" value={query.status || ''} options={[{ value: '', label: 'All statuses' }, ...customerStatuses]} onChange={(event) => changeQuery((current) => ({ ...current, status: event.target.value, page: 1 }))} />
          </div>
          {filtered && <Button variant="ghost" className="h-[42px]" onClick={() => { setSearch(''); changeQuery({ page: 1, limit: query.limit }); }}>Clear filters</Button>}
        </div>
      </div>

      {isLoading ? (
        <p role="status" className="p-10 text-center text-sm text-slate-500">Loading customers...</p>
      ) : listError ? (
        <div role="alert" className="p-8 text-center space-y-3">
          <p className="text-sm text-rose-700">{listError}</p>
          <Button variant="outline" size="sm" onClick={refreshCustomers}>Try again</Button>
        </div>
      ) : !result?.data.length ? (
        <div className="p-10 text-center space-y-2">
          <Users className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">{filtered ? 'No matching customers' : 'No customers yet'}</h3>
          <p className="text-xs text-slate-500">{filtered ? 'Try a different search or clear your filters.' : 'Use the form above to add your first customer.'}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Customer details table">
            <table className="w-full min-w-[900px] text-left text-xs">
              <caption className="sr-only">Customer contact information, requirements, sources, statuses, creation dates, and actions</caption>
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  {['Customer / Phone', 'Requirement / Notes', 'Source / Location', 'Status', 'Added', 'Actions'].map((heading) => <th scope="col" key={heading} className="px-4 py-3 font-semibold whitespace-nowrap">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.data.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/70 align-top">
                    <td className="px-4 py-4 max-w-[200px]">
                      <p className="font-semibold text-slate-900 break-words">{customer.name}</p>
                      <a className="inline-block mt-1 text-blue-600 hover:underline whitespace-nowrap" href={`tel:${customer.phone.replace(/[^+0-9]/g, '')}`}>{customer.phone}</a>
                      <p className="mt-1 text-[11px] text-slate-400">ID: {customer.id}</p>
                    </td>
                    <td className="px-4 py-4 max-w-[240px]">
                      <p className="text-slate-700 whitespace-pre-wrap break-words line-clamp-3">{customer.requirement}</p>
                      <p className="text-slate-500 mt-1 whitespace-pre-wrap break-words line-clamp-2">{customer.notes || 'No notes'}</p>
                    </td>
                    <td className="px-4 py-4 max-w-[160px]">
                      <p className="text-slate-700">{customer.source || 'Other'}</p>
                      <p className="text-slate-500 mt-1 break-words">{customer.location || 'No location'}</p>
                    </td>
                    <td className="px-4 py-4"><Badge size="sm" variant={statusColors[customer.status] || 'gray'} className="whitespace-nowrap">{customer.status}</Badge></td>
                    <td className="px-4 py-4 text-slate-500 min-w-[120px]">{formatDate(customer.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-0.5">
                        <Button variant="ghost" size="sm" aria-label={`View ${customer.name}`} icon={<Eye className="w-3.5 h-3.5" />} onClick={() => openAction('view', customer)}>View</Button>
                        <Button variant="ghost" size="sm" aria-label={`Edit ${customer.name}`} icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openAction('edit', customer)}>Edit</Button>
                        <Button variant="ghost" size="sm" aria-label={`Delete ${customer.name}`} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => openAction('delete', customer)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-500" role="status">Showing {(result.pagination.page - 1) * result.pagination.limit + 1}-{Math.min(result.pagination.page * result.pagination.limit, result.pagination.total)} of {result.pagination.total} customers</p>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" disabled={query.page <= 1} onClick={() => changeQuery((current) => ({ ...current, page: current.page - 1 }))}>Previous</Button>
              <span className="text-xs text-slate-500">Page {query.page} of {result.pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={query.page >= result.pagination.totalPages} onClick={() => changeQuery((current) => ({ ...current, page: current.page + 1 }))}>Next</Button>
            </div>
          </div>
        </>
      )}

      {action && (
        <Modal isOpen onClose={closeAction} maxWidth={action.type === 'delete' ? 'md' : 'xl'}
          title={action.type === 'view' ? 'Customer Details' : action.type === 'edit' ? 'Edit Customer' : 'Delete Customer'}
          subtitle={`${action.customer.name} · ID: ${action.customer.id}`}
          footer={action.type === 'view' ? (
            <><Button variant="outline" onClick={closeAction}>Close</Button><Button icon={<Pencil className="w-4 h-4" />} onClick={() => openAction('edit', action.customer)}>Edit Customer</Button></>
          ) : (
            <><Button variant="outline" disabled={isSaving} onClick={closeAction}>Cancel</Button>{action.type === 'edit' ? <Button type="submit" form="edit-customer-form" loading={isSaving} aria-label={isSaving ? 'Saving changes' : 'Save Changes'}>Save Changes</Button> : <Button variant="danger" loading={isSaving} aria-label={isSaving ? 'Deleting customer' : 'Delete Customer'} onClick={deleteCustomer}>Delete Customer</Button>}</>
          )}>
          {actionError && <p role="alert" className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">{actionError}</p>}
          {action.type === 'view' && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 text-sm">
              {[
                ['Name', action.customer.name], ['Phone', action.customer.phone],
                ['Status', action.customer.status], ['Source', action.customer.source || 'Other'],
                ['Location', action.customer.location || 'Not provided'], ['Created', formatDate(action.customer.createdAt)],
                ['Last updated', formatDate(action.customer.updatedAt)], ['Requirement', action.customer.requirement],
                ['Notes', action.customer.notes || 'No notes'],
              ].map(([label, value]) => <div key={label} className={label === 'Requirement' || label === 'Notes' ? 'sm:col-span-2' : ''}><dt className="text-xs font-semibold text-slate-500 mb-1">{label}</dt><dd className="text-slate-800 whitespace-pre-wrap break-words">{value}</dd></div>)}
            </dl>
          )}
          {action.type === 'edit' && draft && (
            <form id="edit-customer-form" onSubmit={saveCustomer} noValidate>
              <fieldset disabled={isSaving} className="space-y-4">
                <Input id="edit-customer-name" label="Name" requiredStar autoFocus maxLength={120} value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} error={errors.name} />
                <Input id="edit-customer-phone" label="Phone Number" type="tel" requiredStar maxLength={32} value={draft.phone} onChange={(event) => updateDraft('phone', event.target.value)} error={errors.phone} />
                <Textarea id="edit-customer-requirement" label="Requirement" requiredStar maxLength={500} value={draft.requirement} onChange={(event) => updateDraft('requirement', event.target.value)} error={errors.requirement} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select id="edit-customer-source" label="Source" options={customerSources} value={draft.source} onChange={(event) => updateDraft('source', event.target.value)} />
                  <Select id="edit-customer-status" label="Status" options={customerStatuses} value={draft.status} onChange={(event) => updateDraft('status', event.target.value)} />
                </div>
                <Input id="edit-customer-location" label="Location" maxLength={200} value={draft.location} onChange={(event) => updateDraft('location', event.target.value)} />
                <Textarea id="edit-customer-notes" label="Notes" rows={4} maxLength={10000} value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} />
              </fieldset>
            </form>
          )}
          {action.type === 'delete' && <p className="text-sm text-slate-600">Delete <strong className="text-slate-900">{action.customer.name}</strong>? This will also delete their follow-ups. This action cannot be undone.</p>}
        </Modal>
      )}
    </section>
  );
}
