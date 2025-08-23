export interface RestaurantUser {
  id: string;
  email: string;
  displayName: string;
  role: 'owner' | 'manager';
  createdAt: Date | any;
  lastLogin?: Date | any;
  isActive: boolean;
  createdBy?: string;
}

export interface UsersService {
  list(restaurantId: string): Promise<RestaurantUser[]>;
}


