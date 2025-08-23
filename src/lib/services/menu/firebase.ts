import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type { MenuItem as MenuItemType } from '../../../types';
import type { MenuService } from './index';

export const menuServiceFirebase: MenuService = {
  async list(restaurantId: string): Promise<MenuItemType[]> {
    const snap = await getDocs(collection(db, 'restaurantProfile', restaurantId, 'menuItems'));
    const items: MenuItemType[] = [];
    snap.forEach((d) => {
      const data: any = d.data();
      const createdAt = data.createdAt;
      const updatedAt = data.updatedAt;
      items.push({
        id: d.id,
        ...data,
        ...(createdAt && typeof createdAt === 'object' && 'toDate' in createdAt ? { createdAt: createdAt.toDate().toISOString() } : {}),
        ...(updatedAt && typeof updatedAt === 'object' && 'toDate' in updatedAt ? { updatedAt: updatedAt.toDate().toISOString() } : {}),
      } as MenuItemType);
    });
    return items;
  },
  async create(restaurantId: string, data: Omit<MenuItemType, 'id'>): Promise<void> {
    await addDoc(collection(db, 'restaurantProfile', restaurantId, 'menuItems'), data as any);
  },
  async update(restaurantId: string, id: string, data: Partial<MenuItemType>): Promise<void> {
    await updateDoc(doc(db, 'restaurantProfile', restaurantId, 'menuItems', id), data as any);
  },
  async remove(restaurantId: string, id: string): Promise<void> {
    await deleteDoc(doc(db, 'restaurantProfile', restaurantId, 'menuItems', id));
  },
};


