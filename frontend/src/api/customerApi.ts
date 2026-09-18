import { apiClient } from './client';
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '../types/customer';

export const customerApi = {
  async getCustomers(): Promise<Customer[]> {
    const response = await apiClient.get<Customer[]>('/customers');
    return response.data;
  },

  async getCustomerById(id: string): Promise<Customer> {
    const response = await apiClient.get<Customer>(`/customers/${id}`);
    return response.data;
  },

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    const response = await apiClient.post<Customer>('/customers', input);
    return response.data;
  },

  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const response = await apiClient.put<Customer>(`/customers/${id}`, input);
    return response.data;
  },

  async deleteCustomer(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete<{ success: boolean; message?: string }>(`/customers/${id}`);
    return response.data;
  },

  async searchCustomers(query: string): Promise<Customer[]> {
    const response = await apiClient.get<Customer[]>('/customers/search', {
      params: { q: query },
    });
    return response.data;
  },
};
