import type { MenuItem as MenuItemType } from '../../../types';
import type { MenuService } from './index';

const api = (path: string, init?: RequestInit) => fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}${path}`, {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  ...init,
});

export const menuServiceRest: MenuService = {
  async list(restaurantId: string): Promise<MenuItemType[]> {
    const res = await api(`/restaurants/${restaurantId}/menu-items`);
    if (!res.ok) throw new Error('Failed to fetch menu');
    return res.json();
  },
  async create(restaurantId: string, data: Omit<MenuItemType, 'id'>): Promise<void> {
    const res = await api(`/restaurants/${restaurantId}/menu-items`, { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to create menu item');
  },
  async update(restaurantId: string, id: string, data: Partial<MenuItemType>): Promise<void> {
    const res = await api(`/restaurants/${restaurantId}/menu-items/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Failed to update menu item');
  },
  async remove(restaurantId: string, id: string): Promise<void> {
    const res = await api(`/restaurants/${restaurantId}/menu-items/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete menu item');
  },
};


