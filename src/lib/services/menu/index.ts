import type { MenuItem as MenuItemType } from '../../../types';

export interface MenuService {
  list(restaurantId: string): Promise<MenuItemType[]>;
  create(restaurantId: string, data: Omit<MenuItemType, 'id'>): Promise<void>;
  update(restaurantId: string, id: string, data: Partial<MenuItemType>): Promise<void>;
  remove(restaurantId: string, id: string): Promise<void>;
}


