import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type { ExpensesService, Expense } from './index';

export const expensesServiceFirebase: ExpensesService = {
  async list(restaurantId: string): Promise<Expense[]> {
    const snap = await getDocs(collection(db, 'restaurantProfile', restaurantId, 'expenses'));
    const items: Expense[] = [];
    snap.forEach((d) => {
      const data: any = d.data();
      const createdAt = data.createdAt;
      items.push({
        id: d.id,
        ...data,
        ...(createdAt && typeof createdAt === 'object' && 'toDate' in createdAt ? { createdAt: createdAt.toDate().toISOString() } : {}),
      });
    });
    return items;
  },
  async create(restaurantId: string, data) {
    await addDoc(collection(db, 'restaurantProfile', restaurantId, 'expenses'), {
      ...data,
      createdAt: new Date(),
    } as any);
  },
};


