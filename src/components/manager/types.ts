// Shared types for Manager Dashboard components
import { BillItem } from '../../types';

export interface RunningTable {
  tableNumber: string;
  customerType: 'private' | 'loading';
  hallType: 'common' | 'ac';
  items: BillItem[];
  createdAt: Date;
}

export interface DailyStats {
  totalBills: number;
  totalRevenue: number;
  mostSoldItem: { name: string; quantity: number };
  leastSoldItem: { name: string; quantity: number };
  dishStats: Array<{ name: string; quantity: number; revenue: number }>;
}

export interface BillTotals {
  subtotal: number;
  discountAmount: number;
  finalSubtotal: number;
  taxAmount: number;
  totalAmount: number;
} 