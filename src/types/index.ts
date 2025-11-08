export interface User {
  uid: string;
  email: string;
  role: 'owner' | 'manager';
  restaurantId: string;
  displayName?: string;
  photoURL?: string;
  lastLogin?: Date;
  isActive?: boolean;
  devBypass?: boolean;
}

export interface MenuItem {
  id: string;
  itemNo: string;
  name: string;
  description?: string;
  category: string;
  privatePrice: number;
  loadingPrice: number;
  acHallPrice?: number; // AC Hall price (same for both private and loading)
  isAvailable: boolean;
  preparationTime?: number; // in minutes
  imageUrl?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  tableNumber?: string;
  orderCount?: number;
}

export interface BillItem {
  menuItem: MenuItem;
  quantity: number;
  customerType: 'private' | 'loading';
  notes?: string;
  discount?: number; // percentage
  customPrice?: number; // custom price per unit if different from menu price
  discountAmount?: number; // actual discount amount in currency
}

export interface PaymentMethod {
  type: 'cash' | 'card' | 'upi' | 'digital_wallet';
  amount: number;
  reference?: string;
}

export interface Bill {
  id: string;
  billNumber: string | number;
  items: BillItem[];
  customer?: Customer;
  customerType: 'private' | 'loading';
  hallType?: 'common' | 'ac'; // Hall type selection
  subtotal: number;
  finalSubtotal?: number; // subtotal after discounts applied
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethods: PaymentMethod[];
  status: 'pending' | 'paid' | 'cancelled';
  notes?: string;
  createdAt: Date;
  createdBy: string;
  completedAt?: Date;
}

export interface Revenue {
  date: string;
  amount: number;
  billsCount: number;
  avgBillValue: number;
  topSellingItems: Array<{
    itemName: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface Analytics {
  totalRevenue: number;
  totalBills: number;
  avgBillValue: number;
  topSellingItems: MenuItem[];
  revenueByHour: Array<{ hour: number; revenue: number }>;
  revenueByDay: Array<{ day: string; revenue: number }>;
  profitMargin: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

declare global {
  interface Window {
    electronAPI?: {
      checkLatestVersion: () => Promise<any>;
      print: () => void;
      openExternal: (url: string) => void;
      getPrinters: () => Promise<any[]>;
      checkPrinterConnectivity: () => Promise<{
        isConnected: boolean;
        printerCount: number;
        printers: Array<{
          name: string;
          status: string;
          isDefault: boolean;
          isThermal?: boolean;
          priority?: number;
          port?: string;
          connectionType?: string;
          description?: string;
          location?: string;
        }>;
        recommendedPrinter?: {
          name: string;
          isThermal: boolean;
          priority: number;
        } | null;
      }>;
      autoConnectPrinter: () => Promise<{
        success: boolean;
        printer?: {
          name: string;
          isThermal: boolean;
          priority: number;
          status: string;
        };
        error?: string;
      }>;
      testPrinter: (printerName: string) => Promise<{
        success: boolean;
        printer?: {
          name: string;
          status: string;
          isThermal: boolean;
        };
        error?: string;
      }>;
    };
  }
} 