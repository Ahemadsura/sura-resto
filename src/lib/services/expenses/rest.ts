import type { ExpensesService, Expense } from './index';

const api = (path: string, init?: RequestInit) => fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}${path}`, {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  ...init,
});

export const expensesServiceRest: ExpensesService = {
  async list(restaurantId: string): Promise<Expense[]> {
    const res = await api(`/restaurants/${restaurantId}/expenses`);
    if (!res.ok) throw new Error('Failed to fetch expenses');
    return res.json();
  },
  async create(restaurantId: string, data) {
    const res = await api(`/restaurants/${restaurantId}/expenses`, { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to create expense');
  },
};


