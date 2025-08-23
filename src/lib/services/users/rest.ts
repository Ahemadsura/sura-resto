import type { UsersService, RestaurantUser } from './index';

const api = (path: string) => fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}${path}`, { credentials: 'include' });

export const usersServiceRest: UsersService = {
  async list(restaurantId: string): Promise<RestaurantUser[]> {
    const res = await api(`/restaurants/${restaurantId}/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },
};


