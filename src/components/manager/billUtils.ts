import { BillItem, MenuItem as MenuItemType } from '../../types';
import { BillTotals } from './types';

export const TAX_RATE = 0.18; // 18% GST

export const getItemPrice = (
  menuItem: MenuItemType, 
  customerType: 'private' | 'loading', 
  hallType: 'common' | 'ac'
): number => {
  if (hallType === 'ac' && menuItem.acHallPrice) {
    return menuItem.acHallPrice;
  }
  return customerType === 'private' ? menuItem.privatePrice : menuItem.loadingPrice;
};

export const calculateBillTotals = (items: BillItem[], hallType: 'common' | 'ac' = 'common'): BillTotals => {
  const subtotal = items.reduce((total, item) => {
    const price = item.customPrice || getItemPrice(item.menuItem, item.customerType, hallType);
    return total + (price * item.quantity);
  }, 0);

  const totalDiscount = items.reduce((total, item) => {
    return total + (item.discountAmount || 0);
  }, 0);

  return {
    subtotal: subtotal + totalDiscount, // Original subtotal before discount
    discountAmount: totalDiscount,
    finalSubtotal: subtotal, // After discount
    taxAmount: subtotal * TAX_RATE, // 18% GST on discounted amount
    totalAmount: subtotal + (subtotal * TAX_RATE)
  };
};

export const determineCustomerType = (tableNumber: string): 'private' | 'loading' => {
  return tableNumber.toUpperCase().startsWith('P') ? 'private' : 'loading';
};

export const getBillSummaryData = (items: BillItem[], hallType: 'common' | 'ac' = 'common') => {
  const totals = calculateBillTotals(items, hallType);
  const itemCount = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  
  return {
    totals,
    itemCount,
    totalQuantity
  };
}; 