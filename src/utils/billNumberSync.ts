// Firebase Bill Number Synchronization Utility
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { updateHighestBillNumber } from './helpers';

export class BillNumberSync {
  
  // Sync highest bill number from Firebase on app startup
  static async syncFromFirebase(restaurantId?: string): Promise<number> {
    try {
      console.log('🔄 Syncing bill numbers from Firebase...');
      
      if (!restaurantId) {
        console.warn('⚠️ No restaurant ID provided, using cached value');
        return parseInt(localStorage.getItem('lastBillNumber') || '0');
      }
      
      // Get the latest bills ordered by bill number (descending)
      const billsRef = collection(db, 'restaurantProfile', restaurantId, 'bills');
      const q = query(billsRef, orderBy('billNumber', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      
      let highestNumber = 0;
      
      snapshot.forEach(doc => {
        const bill = doc.data();
        const billNum = this.extractBillNumber(bill.billNumber);
        if (billNum > highestNumber) {
          highestNumber = billNum;
        }
      });
      
      // Update local cache
      updateHighestBillNumber(highestNumber);
      console.log('✅ Synced highest bill number from Firebase:', highestNumber);
      
      return highestNumber;
    } catch (error) {
      console.error('❌ Failed to sync bill numbers from Firebase:', error);
      return 0;
    }
  }
  
  // Extract numeric bill number from various formats
  static extractBillNumber(billNumber: any): number {
    if (typeof billNumber === 'number') {
      return billNumber;
    }
    
    if (typeof billNumber === 'string') {
      // Handle formats like "27", "BILL-27", "BILL-123456-789", etc.
      const matches = billNumber.match(/\d+/g);
      if (matches) {
        // For formats like "BILL-123456-789", take the first number that looks like a bill number
        const numbers = matches.map(m => parseInt(m));
        // Prefer shorter numbers (likely to be sequential bill numbers)
        const sequentialNumbers = numbers.filter(n => n > 0 && n < 100000);
        if (sequentialNumbers.length > 0) {
          return Math.max(...sequentialNumbers);
        }
        // Fallback to any number found
        return Math.max(...numbers);
      }
    }
    
    return 0;
  }
  
  // Check if a bill number already exists in Firebase
  static async billNumberExists(billNumber: string | number, restaurantId?: string): Promise<boolean> {
    try {
      if (!restaurantId) {
        console.warn('⚠️ No restaurant ID provided for bill number check');
        return false;
      }
      
      const billsRef = collection(db, 'restaurantProfile', restaurantId, 'bills');
      const q = query(billsRef, where('billNumber', '==', billNumber), limit(1));
      const snapshot = await getDocs(q);
      
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking bill number existence:', error);
      return false;
    }
  }
  
  // Get safe next bill number (checks Firebase for conflicts)
  static async getSafeNextBillNumber(restaurantId?: string): Promise<number> {
    try {
      // Start with cached highest number
      const cachedHighest = parseInt(localStorage.getItem('lastBillNumber') || '0');
      let nextNumber = Math.max(cachedHighest, await this.syncFromFirebase(restaurantId)) + 1;
      
      // Check for conflicts and increment if needed
      while (await this.billNumberExists(nextNumber, restaurantId)) {
        console.warn(`⚠️ Bill number ${nextNumber} already exists, trying ${nextNumber + 1}`);
        nextNumber++;
      }
      
      // Update cache
      updateHighestBillNumber(nextNumber);
      
      return nextNumber;
    } catch (error) {
      console.error('Failed to get safe bill number:', error);
      // Fallback to timestamp-based if all else fails
      return Date.now() % 100000;
    }
  }
} 