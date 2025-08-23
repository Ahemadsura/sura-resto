import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type { Bill } from '../../../types';
import type { BillsService } from './index';

export const billsServiceFirebase: BillsService = {
  async list(restaurantId: string): Promise<Bill[]> {
    const snap = await getDocs(collection(db, 'restaurantProfile', restaurantId, 'bills'));
    const bills: Bill[] = [];
    snap.forEach((d) => {
      const data: any = d.data();
      const createdAt = data.createdAt;
      bills.push({
        id: d.id,
        ...data,
        ...(createdAt && typeof createdAt === 'object' && 'toDate' in createdAt ? { createdAt: createdAt.toDate().toISOString() } : {}),
      } as Bill);
    });
    return bills;
  },
};


