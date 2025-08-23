import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type { UsersService, RestaurantUser } from './index';

export const usersServiceFirebase: UsersService = {
  async list(restaurantId: string): Promise<RestaurantUser[]> {
    const usersCollection = collection(db, 'restaurantProfile', restaurantId, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    const userData: RestaurantUser[] = [];
    usersSnapshot.forEach((doc) => {
      const data: any = doc.data();
      userData.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt
          ? data.createdAt.toDate().toISOString()
          : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
        lastLogin: data.lastLogin && typeof data.lastLogin === 'object' && 'toDate' in data.lastLogin
          ? data.lastLogin.toDate().toISOString()
          : data.lastLogin,
        isActive: data.isActive !== undefined ? data.isActive : (data.role === 'owner' ? true : false)
      } as RestaurantUser);
    });
    return userData;
  },
};


