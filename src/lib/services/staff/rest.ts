import type { StaffService, StaffMember } from './index';

const api = (path: string, init?: RequestInit) => fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}${path}`, {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  ...init,
});

export const staffServiceRest: StaffService = {
  async list(restaurantId: string): Promise<StaffMember[]> {
    const res = await api(`/restaurants/${restaurantId}/staff`);
    if (!res.ok) throw new Error('Failed to fetch staff');
    return res.json();
  },
  async create(restaurantId: string, data: Omit<StaffMember, 'id'>): Promise<string> {
    const res = await api(`/restaurants/${restaurantId}/staff`, { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to add staff');
    const json = await res.json();
    return json.id as string;
  },
  async update(restaurantId: string, id: string, data: Partial<StaffMember>): Promise<void> {
    const res = await api(`/restaurants/${restaurantId}/staff/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to update staff');
  },
  async remove(restaurantId: string, id: string): Promise<void> {
    const res = await api(`/restaurants/${restaurantId}/staff/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove staff');
  },
};


