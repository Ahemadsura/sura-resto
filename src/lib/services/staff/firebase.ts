import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type { StaffService, StaffMember } from './index';

export const staffServiceFirebase: StaffService = {
  async list(restaurantId: string): Promise<StaffMember[]> {
    const snap = await getDocs(collection(db, 'restaurantProfile', restaurantId, 'staff'));
    const items: StaffMember[] = [];
    snap.forEach((d) => {
      const data: any = d.data();
      const lastPaidDate = data.lastPaidDate;
      items.push({
        id: d.id,
        ...data,
        ...(lastPaidDate && typeof lastPaidDate === 'object' && 'toDate' in lastPaidDate ? { lastPaidDate: lastPaidDate.toDate().toISOString() } : {}),
      });
    });
    return items;
  },
  async create(restaurantId: string, data: Omit<StaffMember, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, 'restaurantProfile', restaurantId, 'staff'), data as any);
    return ref.id;
  },
  async update(restaurantId: string, id: string, data: Partial<StaffMember>): Promise<void> {
    await updateDoc(doc(db, 'restaurantProfile', restaurantId, 'staff', id), data as any);
  },
  async remove(restaurantId: string, id: string): Promise<void> {
    await deleteDoc(doc(db, 'restaurantProfile', restaurantId, 'staff', id));
  },
};


