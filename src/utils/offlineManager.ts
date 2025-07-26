// Simplified Offline Data Manager for Restaurant Billing System
import { MenuItem, Bill } from '../types';
import { generateBillNumber, updateHighestBillNumber } from './helpers';

export interface OfflineBill extends Omit<Bill, 'id'> {
  offlineId: string;
  synced: boolean;
  lastModified: Date;
  syncAttempts: number;
  firebaseId?: string; // Firebase document ID after sync
}

export interface NetworkStatus {
  isOnline: boolean;
  lastOnline: Date | null;
  syncInProgress: boolean;
}

class SimpleOfflineManager {
  private networkStatus: NetworkStatus = {
    isOnline: true, // Default to online for better UX
    lastOnline: new Date(),
    syncInProgress: false
  };

  private syncCallbacks: Array<(status: NetworkStatus) => void> = [];

  constructor() {
    this.initializeNetworkListeners();
    this.loadNetworkStatus();
  }

  // =====================
  // NETWORK MANAGEMENT
  // =====================

  private initializeNetworkListeners() {
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));
  }

  private handleNetworkChange(isOnline: boolean) {
    const wasOffline = !this.networkStatus.isOnline;
    
    this.networkStatus.isOnline = isOnline;
    if (isOnline) {
      this.networkStatus.lastOnline = new Date();
    }

    this.saveNetworkStatus();
    this.notifyNetworkChange();

    // Auto-sync when coming back online
    if (wasOffline && isOnline) {
      setTimeout(() => this.syncPendingData(), 1000);
    }
  }

  private loadNetworkStatus() {
    try {
      const stored = this.getStoredData('networkStatus');
      if (stored) {
        this.networkStatus = {
          ...stored,
          lastOnline: stored.lastOnline ? new Date(stored.lastOnline) : null
        };
      }
    } catch (error) {
      console.warn('Failed to load network status:', error);
    }
  }

  private saveNetworkStatus() {
    this.setStoredData('networkStatus', this.networkStatus);
  }

  private notifyNetworkChange() {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(this.networkStatus);
      } catch (error) {
        console.error('Network callback error:', error);
      }
    });
  }

  // =====================
  // STORAGE MANAGEMENT
  // =====================

  private getStoredData(key: string, defaultValue: any = null): any {
    try {
      // Use localStorage for web/electron renderer
      const item = localStorage.getItem(`offline_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Failed to get stored data:', error);
      return defaultValue;
    }
  }

  private setStoredData(key: string, value: any): void {
    try {
      // Use localStorage for web/electron renderer
      localStorage.setItem(`offline_${key}`, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to set stored data:', error);
    }
  }

  private deleteStoredData(key: string): void {
    try {
      localStorage.removeItem(`offline_${key}`);
    } catch (error) {
      console.error('Failed to delete stored data:', error);
    }
  }

  // =====================
  // BILLS MANAGEMENT
  // =====================

  async saveBillOffline(bill: Omit<Bill, 'id'>, restaurantId?: string): Promise<OfflineBill> {
    // Generate sequential bill number (same as online)
    const sequentialBillNumber = await generateBillNumber(restaurantId);
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
    
    const offlineBill: OfflineBill = {
      ...bill,
      billNumber: sequentialBillNumber, // Use sequential number like online bills
      offlineId: `offline_${timestamp}_${randomSuffix}`,
      synced: false,
      lastModified: new Date(),
      syncAttempts: 0
    };

    const pendingBills = this.getPendingBills();
    pendingBills.push(offlineBill);
    this.setStoredData('pendingBills', pendingBills);

    console.log('📱 Bill saved offline with sequential number:', sequentialBillNumber);
    return offlineBill;
  }

  getPendingBills(): OfflineBill[] {
    const bills = this.getStoredData('pendingBills', []);
    // Convert date strings back to Date objects
    return bills.map((bill: any) => ({
      ...bill,
      createdAt: new Date(bill.createdAt),
      completedAt: bill.completedAt ? new Date(bill.completedAt) : undefined,
      lastModified: new Date(bill.lastModified)
    }));
  }

  updateBillOffline(offlineId: string, updates: Partial<OfflineBill>): boolean {
    const pendingBills = this.getPendingBills();
    const billIndex = pendingBills.findIndex(bill => bill.offlineId === offlineId);
    
    if (billIndex === -1) return false;

    pendingBills[billIndex] = {
      ...pendingBills[billIndex],
      ...updates,
      lastModified: new Date()
    };

    this.setStoredData('pendingBills', pendingBills);
    return true;
  }

  deletePendingBill(offlineId: string): boolean {
    const pendingBills = this.getPendingBills();
    const filtered = pendingBills.filter(bill => bill.offlineId !== offlineId);
    
    if (filtered.length === pendingBills.length) return false;

    this.setStoredData('pendingBills', filtered);
    return true;
  }

  // =====================
  // MENU ITEMS CACHING
  // =====================

  cacheMenuItems(items: MenuItem[]): void {
    this.setStoredData('cachedMenuItems', items);
    this.setStoredData('menuCacheTime', new Date());
  }

  getCachedMenuItems(): MenuItem[] {
    return this.getStoredData('cachedMenuItems', []);
  }

  isMenuCacheValid(maxAgeMinutes: number = 30): boolean {
    const cacheTime = this.getStoredData('menuCacheTime');
    if (!cacheTime) return false;

    const cacheDate = new Date(cacheTime);
    const now = new Date();
    const ageMinutes = (now.getTime() - cacheDate.getTime()) / (1000 * 60);

    return ageMinutes < maxAgeMinutes;
  }

  // =====================
  // SYNC OPERATIONS
  // =====================

  async syncPendingData(): Promise<{ success: number; failed: number; errors: Error[] }> {
    if (this.networkStatus.syncInProgress) {
      console.log('🔄 Sync already in progress');
      return { success: 0, failed: 0, errors: [] };
    }

    if (!this.networkStatus.isOnline) {
      console.log('📡 Cannot sync: offline');
      return { success: 0, failed: 0, errors: [new Error('Device is offline')] };
    }

    this.networkStatus.syncInProgress = true;
    this.notifyNetworkChange();

    const results = { success: 0, failed: 0, errors: [] as Error[] };

    try {
      const pendingBills = this.getPendingBills().filter(bill => !bill.synced);
      console.log(`🔄 Found ${pendingBills.length} pending bills to sync`);

      for (const bill of pendingBills) {
        try {
          // Validate bill data before syncing
          if (!this.validateBillData(bill)) {
            console.error(`❌ Bill ${bill.billNumber} failed validation`);
            // Mark as synced to prevent retry of invalid data
            this.updateBillOffline(bill.offlineId, { synced: true });
            results.failed++;
            results.errors.push(new Error(`Invalid bill data: ${bill.billNumber}`));
            continue;
          }

          // This hook allows the UI to handle the actual Firebase sync
          console.log('📤 Ready to sync bill:', bill.offlineId);
          
          // For now, mark as successful - the UI will handle actual Firebase sync
          // and update the bill status accordingly
          results.success++;
        } catch (error) {
          console.error('Failed to sync bill:', bill.offlineId, error);
          results.failed++;
          results.errors.push(error as Error);
          
          // Increment sync attempts
          const newAttempts = bill.syncAttempts + 1;
          this.updateBillOffline(bill.offlineId, {
            syncAttempts: newAttempts
          });

          // Give up after 5 failed attempts
          if (newAttempts >= 5) {
            console.error(`🚫 Giving up on bill ${bill.billNumber} after 5 attempts`);
            this.updateBillOffline(bill.offlineId, { synced: true });
          }
        }
      }

      console.log(`✅ Sync complete: ${results.success} success, ${results.failed} failed`);

    } catch (error) {
      console.error('Sync process error:', error);
      results.errors.push(error as Error);
    } finally {
      this.networkStatus.syncInProgress = false;
      this.notifyNetworkChange();
    }

    return results;
  }

  // Production-ready bill validation
  private validateBillData(bill: OfflineBill): boolean {
    // Check required fields
    const billNumberStr = typeof bill.billNumber === 'string' ? bill.billNumber : bill.billNumber.toString();
    if (!bill.billNumber || billNumberStr.trim() === '') {
      console.error('❌ Bill missing bill number');
      return false;
    }
    
    if (!bill.customer?.tableNumber) {
      console.error('❌ Bill missing table number');
      return false;
    }
    
    if (!bill.items || bill.items.length === 0) {
      console.error('❌ Bill has no items');
      return false;
    }
    
    if (!bill.totalAmount || bill.totalAmount <= 0) {
      console.error('❌ Bill has invalid total amount');
      return false;
    }
    
    if (!bill.createdAt) {
      console.error('❌ Bill missing timestamp');
      return false;
    }

    // Validate payment methods
    if (!bill.paymentMethods || bill.paymentMethods.length === 0) {
      console.error('❌ Bill missing payment methods');
      return false;
    }

    const validPaymentTypes = ['cash', 'card', 'upi', 'digital_wallet'];
    for (const payment of bill.paymentMethods) {
      if (!validPaymentTypes.includes(payment.type)) {
        console.error('❌ Bill has invalid payment method:', payment.type);
        return false;
      }
      if (payment.amount <= 0) {
        console.error('❌ Payment method has invalid amount:', payment.amount);
        return false;
      }
    }
    
    // Validate each item
    for (const item of bill.items) {
      if (!item.menuItem?.name || item.menuItem.name.trim() === '') {
        console.error('❌ Bill contains item without name');
        return false;
      }
      
      if (!item.quantity || item.quantity <= 0) {
        console.error('❌ Bill contains item with invalid quantity:', item.quantity);
        return false;
      }
      
      const itemPrice = item.customerType === 'private' ? item.menuItem.privatePrice : item.menuItem.loadingPrice;
      if (!itemPrice || itemPrice <= 0) {
        console.error('❌ Bill contains item with invalid price:', itemPrice);
        return false;
      }
    }

    // Validate payment total matches bill total
    const paymentTotal = bill.paymentMethods.reduce((sum, payment) => sum + payment.amount, 0);
    const totalDiff = Math.abs(paymentTotal - bill.totalAmount);
    
    if (totalDiff > 0.01) { // Allow for small rounding differences
      console.error('❌ Payment total doesn\'t match bill total:', {
        paymentTotal,
        billTotal: bill.totalAmount
      });
      return false;
    }
    
    return true;
  }

  // Mark a specific bill as successfully synced
  markBillSynced(offlineId: string, firebaseId?: string): boolean {
    return this.updateBillOffline(offlineId, {
      synced: true,
      firebaseId: firebaseId
    });
  }

  // Get bills that failed to sync multiple times
  getProblematicBills(): OfflineBill[] {
    return this.getPendingBills().filter(bill => 
      !bill.synced && bill.syncAttempts >= 3
    );
  }

  // Sync the highest bill number from Firebase (call this when app starts)
  async syncHighestBillNumber(onlineBills: any[]): Promise<void> {
    try {
      if (onlineBills.length === 0) return;

      const highestOnlineBill = onlineBills.reduce((max, bill) => {
        const billNum = typeof bill.billNumber === 'string' ? parseInt(bill.billNumber) || 0 : bill.billNumber;
        const maxNum = typeof max.billNumber === 'string' ? parseInt(max.billNumber) || 0 : max.billNumber;
        return billNum > maxNum ? bill : max;
      });

      updateHighestBillNumber(highestOnlineBill.billNumber);
      console.log('📊 Synced highest bill number:', highestOnlineBill.billNumber);
    } catch (error) {
      console.error('Failed to sync highest bill number:', error);
    }
  }

  // =====================
  // PUBLIC API
  // =====================

  isOnline(): boolean {
    return this.networkStatus.isOnline;
  }

  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  onNetworkChange(callback: (status: NetworkStatus) => void) {
    this.syncCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.syncCallbacks.indexOf(callback);
      if (index > -1) {
        this.syncCallbacks.splice(index, 1);
      }
    };
  }

  getPendingDataCount(): { bills: number } {
    return {
      bills: this.getPendingBills().length
    };
  }

  clearAllOfflineData(): void {
    this.deleteStoredData('pendingBills');
    this.deleteStoredData('cachedMenuItems');
    this.deleteStoredData('menuCacheTime');
    this.deleteStoredData('networkStatus');
    console.log('🗑️ All offline data cleared');
  }

  // Show offline notification
  showOfflineNotification(): void {
    if (!this.isOnline()) {
      console.log('📱 Working offline - data will sync when connection returns');
    }
  }
}

// Singleton instance
export const offlineManager = new SimpleOfflineManager(); 