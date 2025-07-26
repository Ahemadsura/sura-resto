import { BillItem, PaymentMethod } from '../types';

// Tax rate (adjustable)
export const TAX_RATE = 0.18; // 18% GST
export const SERVICE_CHARGE_RATE = 0.10; // 10% service charge

// Generate sequential bill number (works online and offline)
export const generateBillNumber = async (restaurantId?: string): Promise<string> => {
  try {
    // Try to get the next sequential number
    const nextNumber = await getNextBillNumber(restaurantId);
    return nextNumber.toString();
  } catch (error) {
    console.error('Failed to generate sequential bill number:', error);
    // Fallback to timestamp-based if sequential fails
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BILL-${timestamp}-${random}`;
  }
};

// Get next sequential bill number
export const getNextBillNumber = async (restaurantId?: string): Promise<number> => {
  // Get the highest bill number from both online and offline bills
  const [onlineMax, offlineMax] = await Promise.all([
    getHighestOnlineBillNumber(restaurantId),
    getHighestOfflineBillNumber()
  ]);
  
  const highestNumber = Math.max(onlineMax, offlineMax);
  const nextNumber = highestNumber + 1;
  
  // Cache this number locally to ensure uniqueness
  saveToLocalStorage('lastBillNumber', nextNumber);
  
  return nextNumber;
};

// Get highest bill number from Firebase
const getHighestOnlineBillNumber = async (restaurantId?: string): Promise<number> => {
  try {
    // Use the BillNumberSync utility for Firebase integration
    const { BillNumberSync } = await import('./billNumberSync');
    return await BillNumberSync.syncFromFirebase(restaurantId);
  } catch (error) {
    console.error('Failed to get online bill number:', error);
    return getFromLocalStorage('lastBillNumber') || 0;
  }
};

// Get highest bill number from offline storage
const getHighestOfflineBillNumber = (): number => {
  try {
    const offlineBills = getFromLocalStorage('offline_pendingBills') || [];
    const numbers = offlineBills
      .map((bill: any) => {
        const billNum = bill.billNumber;
        // Extract number from bill number (handle both numeric and string formats)
        if (typeof billNum === 'number') return billNum;
        if (typeof billNum === 'string') {
          const match = billNum.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        }
        return 0;
      })
      .filter((num: number) => num > 0);
    
    return numbers.length > 0 ? Math.max(...numbers) : 0;
  } catch (error) {
    console.error('Failed to get offline bill numbers:', error);
    return 0;
  }
};

// Update the cached highest bill number (call this when bills are synced)
export const updateHighestBillNumber = (billNumber: number | string) => {
  const num = typeof billNumber === 'string' ? parseInt(billNumber) || 0 : billNumber;
  const current = getFromLocalStorage('lastBillNumber') || 0;
  if (num > current) {
    saveToLocalStorage('lastBillNumber', num);
    saveToLocalStorage('lastOnlineBillNumber', num);
  }
};

// Calculate bill totals
export const calculateBillTotals = (items: BillItem[]) => {
  const subtotal = items.reduce((total, item) => {
    const price = item.customerType === 'private' 
      ? item.menuItem.privatePrice 
      : item.menuItem.loadingPrice;
    const itemTotal = price * item.quantity;
    const discountAmount = item.discount ? (itemTotal * item.discount) / 100 : 0;
    return total + (itemTotal - discountAmount);
  }, 0);

  const taxAmount = subtotal * TAX_RATE;
  const totalAmount = subtotal + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    discountAmount: items.reduce((total, item) => {
      const price = item.customerType === 'private' 
        ? item.menuItem.privatePrice 
        : item.menuItem.loadingPrice;
      const itemTotal = price * item.quantity;
      const discountAmount = item.discount ? (itemTotal * item.discount) / 100 : 0;
      return total + discountAmount;
    }, 0)
  };
};

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format date
export const formatDate = (date: Date | any): string => {
  let dateObj: Date;
  
  if (date && typeof date === 'object' && 'toDate' in date) {
    // Firestore timestamp
    dateObj = date.toDate();
  } else {
    dateObj = new Date(date);
  }
  
  return dateObj.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format time only
export const formatTime = (date: Date | any): string => {
  let dateObj: Date;
  
  if (date && typeof date === 'object' && 'toDate' in date) {
    dateObj = date.toDate();
  } else {
    dateObj = new Date(date);
  }
  
  return dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Validate payment methods
export const validatePayments = (paymentMethods: PaymentMethod[], totalAmount: number): boolean => {
  const totalPaid = paymentMethods.reduce((sum, payment) => sum + payment.amount, 0);
  return Math.abs(totalPaid - totalAmount) < 0.01; // Allow for rounding differences
};

// Get payment summary
export const getPaymentSummary = (paymentMethods: PaymentMethod[]) => {
  const summary: Record<string, number> = {};
  paymentMethods.forEach(payment => {
    summary[payment.type] = (summary[payment.type] || 0) + payment.amount;
  });
  return summary;
};

// Search items function
export const searchItems = (items: any[], searchTerm: string, searchFields: string[]) => {
  if (!searchTerm) return items;
  
  const lowerSearchTerm = searchTerm.toLowerCase();
  return items.filter(item =>
    searchFields.some(field => {
      const fieldValue = field.split('.').reduce((obj, key) => obj?.[key], item);
      return fieldValue?.toString().toLowerCase().includes(lowerSearchTerm);
    })
  );
};

// Debounce function for search
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Local storage helpers
export const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const getFromLocalStorage = (key: string) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
};

// Get business hours analytics
export const getBusinessHours = (bills: any[]) => {
  const hourlyData: Record<number, { count: number; revenue: number }> = {};
  
  for (let hour = 0; hour < 24; hour++) {
    hourlyData[hour] = { count: 0, revenue: 0 };
  }
  
  bills.forEach(bill => {
    let dateObj: Date;
    if (bill.createdAt && typeof bill.createdAt === 'object' && 'toDate' in bill.createdAt) {
      dateObj = bill.createdAt.toDate();
    } else {
      dateObj = new Date(bill.createdAt);
    }
    
    const hour = dateObj.getHours();
    hourlyData[hour].count += 1;
    hourlyData[hour].revenue += bill.totalAmount;
  });
  
  return Object.entries(hourlyData).map(([hour, data]) => ({
    hour: parseInt(hour),
    count: data.count,
    revenue: data.revenue,
    label: `${hour.padStart(2, '0')}:00`
  }));
}; 