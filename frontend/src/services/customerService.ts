import { customerApi } from '../api/customerApi';
import type { Customer, CreateCustomerInput, UpdateCustomerInput, CustomerListQuery, CustomerPage } from '../types/customer';

export const customerService = {
  async getCustomerPage(query: CustomerListQuery): Promise<CustomerPage> {
    return await customerApi.getCustomerPage(query);
  },

  async getCustomers(): Promise<Customer[]> {
    return await customerApi.getCustomers();
  },

  async getCustomerById(id: string): Promise<Customer> {
    return await customerApi.getCustomerById(id);
  },

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    return await customerApi.createCustomer(input);
  },

  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
    return await customerApi.updateCustomer(id, input);
  },

  async deleteCustomer(id: string): Promise<boolean> {
    const res = await customerApi.deleteCustomer(id);
    return res.success;
  },

  async searchCustomers(query: string): Promise<Customer[]> {
    return await customerApi.searchCustomers(query);
  },
};
