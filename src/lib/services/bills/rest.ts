import type { Bill } from '../../../types';
import type { BillsService } from './index';

const api = (path: string) => fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}${path}`, { credentials: 'include' });

export const billsServiceRest: BillsService = {
  async list(restaurantId: string): Promise<Bill[]> {
    const res = await api(`/restaurants/${restaurantId}/bills`);
    if (!res.ok) throw new Error('Failed to fetch bills');
    return res.json();
  },
};


