import { Bill, BillItem } from '../../../types';

// Types
type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom' | 'customYear' | 'customDay' | 'customRange';

interface AnalyticsDateRange {
  start: Date;
  end: Date;
  label: string;
}

interface CustomDate {
  month: number;
  year: number;
}

interface CustomDateRange {
  startDate: string;
  endDate: string;
}

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  createdBy: string;
  createdAt: Date;
}

type StaffType = {
  id?: string;
  name: string;
  salary: number;
  paid: boolean;
  joinDate: string;
  lastPaidDate?: string;
  pendingMonths: number;
  prepaid: { month: number; year: number; amount: number }[];
  leave: number;
  leaveHistory?: { month: number; year: number; days: number }[];
  paymentHistory: { month: number; year: number; amount: number; paidDate: string; type: 'salary' | 'upad' }[];
};

interface AnalyticsData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalBills: number;
  avgBillValue: number;
  topSellingItems: Array<{ id: string; quantity: number; revenue: number; name: string }>;
  profitMargin: number;
  rawMaterialExpense: number;
  upadAsExpense: number;
  staffSalaryExpense: number;
  avgDayRevenue: number;
  avgDayRevenueSubtitle: string;
  avgDayRevenueMonth: number;
  avgMonthRevenue: number;
  avgMonthRevenueSubtitle: string;
}

interface DateRangeParams {
  customDate?: CustomDate;
  customDay?: number;
  customMonth?: number;
  customYear?: number;
  customDateRange?: CustomDateRange;
}

export const getDateRange = (
  filter: string, 
  params: DateRangeParams = {}
): AnalyticsDateRange => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const { customDate, customDay, customMonth, customYear, customDateRange } = params;
  
  switch (filter) {
    case 'today':
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      return {
        start: today,
        end: endOfDay,
        label: `Today (${today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})`
      };
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      return {
        start: yesterday,
        end: endOfYesterday,
        label: `Yesterday (${yesterday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})`
      };
    
    case 'week':
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return {
        start: startOfWeek,
        end: endOfWeek,
        label: `This Week (${startOfWeek.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})`
      };
    
    case 'month':
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      return {
        start: startOfMonth,
        end: endOfMonth,
        label: `This Month (${startOfMonth.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${endOfMonth.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})`
      };
    
    case 'year':
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      endOfYear.setHours(23, 59, 59, 999);
      return {
        start: startOfYear,
        end: endOfYear,
        label: `This Year (${startOfYear.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${endOfYear.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})`
      };
    
    case 'custom':
      if (!customDate) {
        const fallbackEnd = new Date(today);
        fallbackEnd.setHours(23, 59, 59, 999);
        return {
          start: today,
          end: fallbackEnd,
          label: `Today (${today.toLocaleDateString()})`
        };
      }
      const startOfCustomMonth = new Date(customDate.year, customDate.month, 1);
      const endOfCustomMonth = new Date(customDate.year, customDate.month + 1, 0);
      endOfCustomMonth.setHours(23, 59, 59, 999);
      return {
        start: startOfCustomMonth,
        end: endOfCustomMonth,
        label: `${startOfCustomMonth.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} (${startOfCustomMonth.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${endOfCustomMonth.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})`
      };
    
    case 'customYear':
      if (!customDate) {
        const fallbackEnd = new Date(today);
        fallbackEnd.setHours(23, 59, 59, 999);
        return {
          start: today,
          end: fallbackEnd,
          label: `Today (${today.toLocaleDateString()})`
        };
      }
      const startOfCustomYear = new Date(customDate.year, 0, 1);
      const endOfCustomYear = new Date(customDate.year, 11, 31);
      endOfCustomYear.setHours(23, 59, 59, 999);
      return {
        start: startOfCustomYear,
        end: endOfCustomYear,
        label: `${customDate.year} (${startOfCustomYear.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${endOfCustomYear.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})`
      };
    
    case 'customDay': {
      // Create a new date object with the custom date values, falling back to today's values if not set
      const safeDay = customDay ?? today.getDate();
      const safeMonth = customMonth ?? today.getMonth();
      const safeYear = customYear ?? today.getFullYear();
      
      const startOfCustomDay = new Date(safeYear, safeMonth, safeDay, 0, 0, 0, 0);
      const endOfCustomDay = new Date(safeYear, safeMonth, safeDay, 23, 59, 59, 999);
      
      return {
        start: startOfCustomDay,
        end: endOfCustomDay,
        label: `${startOfCustomDay.toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        })}`
      };
    }
    case 'customRange':
      if (customDateRange?.startDate && customDateRange?.endDate) {
        const startDate = new Date(customDateRange.startDate);
        const endDate = new Date(customDateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        return {
          start: startDate,
          end: endDate,
          label: `Custom Range (${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})`
        };
      }
      // Fall back to today if dates not set
      const fallbackEnd = new Date(today);
      fallbackEnd.setHours(23, 59, 59, 999);
      return {
        start: today,
        end: fallbackEnd,
        label: `Today (${today.toLocaleDateString()})`
      };
    
    default:
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
        label: `Today (${today.toLocaleDateString()})`
      };
  }
};

export const calculateAnalytics = (
  bills: Bill[],
  expenses: Expense[],
  staffList: StaffType[],
  dateFilter: DateFilter,
  totalStaffSalary: number,
  params: DateRangeParams = {}
): AnalyticsData => {
  const { start, end } = getDateRange(dateFilter, params);
  
  // Filter bills by date range - For analytics, we keep all historical data
  const relevantBills = bills.filter(bill => {
    let billDate: Date;
    if (bill.createdAt && typeof bill.createdAt === 'object' && 'toDate' in bill.createdAt) {
      billDate = (bill.createdAt as any).toDate();
    } else {
      billDate = new Date(bill.createdAt);
    }
    return billDate >= start && billDate <= end;
  });

  // Filter expenses by date range
  const relevantExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate >= start && expenseDate <= end;
  });

  // --- Add upad as expense ---
  // Find all upad payments in the selected date range
  const upadAsExpense = staffList.reduce((sum, staff) => {
    return sum + staff.paymentHistory
      .filter(h => h.type === 'upad')
      .filter(h => {
        const paidDate = new Date(h.paidDate);
        return paidDate >= start && paidDate <= end;
      })
      .reduce((a, h) => a + h.amount, 0);
  }, 0);

  // Calculate revenue totals
  const totalRevenue = relevantBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const totalBills = relevantBills.length;
  const avgBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;

  // Calculate expense totals (add upadAsExpense)
  const rawMaterialExpense = relevantExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const showStaffSalaryInExpense = ["month", "year", "custom", "customYear"].includes(dateFilter);
  // Only include staff salary if there is activity in the period
  const hasActivity = totalRevenue > 0 || rawMaterialExpense > 0 || upadAsExpense > 0;
  let staffSalaryToSubtract = 0;
  if (hasActivity) {
    if (["month", "custom"].includes(dateFilter)) {
      staffSalaryToSubtract = totalStaffSalary;
    } else if (["year", "customYear"].includes(dateFilter)) {
      // FIX: Only deduct actual staff salary paid in the selected year
      const year = dateFilter === "year" ? new Date().getFullYear() : (params.customDate?.year ?? new Date().getFullYear());
      staffSalaryToSubtract = staffList.reduce((sum, staff) =>
        sum + staff.paymentHistory.filter(h => h.type === 'salary' && h.year === year).reduce((a, h) => a + h.amount, 0)
      , 0);
    }
  }
  const totalExpenses = rawMaterialExpense + upadAsExpense;
  const netProfit = totalRevenue - totalExpenses - (showStaffSalaryInExpense ? staffSalaryToSubtract : 0);
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Top selling items
  const itemSales = new Map<string, { quantity: number; revenue: number; name: string }>();
  relevantBills.forEach((bill: Bill) => {
    bill.items.forEach((item: BillItem) => {
      const key = item.menuItem.id;
      const existing = itemSales.get(key) || { quantity: 0, revenue: 0, name: item.menuItem.name };
      const price = item.customerType === 'private' ? item.menuItem.privatePrice : item.menuItem.loadingPrice;
      itemSales.set(key, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + (price * item.quantity),
        name: item.menuItem.name
      });
    });
  });

  const topSellingItems = Array.from(itemSales.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Calculate staff paid salary for the selected period using paymentHistory
  let staffPaidSalary = 0;
  if (["month", "custom"].includes(dateFilter)) {
    // For the selected month
    const month = dateFilter === "month" ? new Date().getMonth() : (params.customDate?.month ?? new Date().getMonth());
    const year = dateFilter === "month" ? new Date().getFullYear() : (params.customDate?.year ?? new Date().getFullYear());
    staffPaidSalary = staffList.reduce((sum, staff) =>
      sum + staff.paymentHistory.filter(h => h.type === 'salary' && h.month === month && h.year === year).reduce((a, h) => a + h.amount, 0)
    , 0);
  } else if (["year", "customYear"].includes(dateFilter)) {
    // For the selected year
    const year = dateFilter === "year" ? new Date().getFullYear() : (params.customDate?.year ?? new Date().getFullYear());
    staffPaidSalary = staffList.reduce((sum, staff) =>
      sum + staff.paymentHistory.filter(h => h.type === 'salary' && h.year === year).reduce((a, h) => a + h.amount, 0)
    , 0);
  }

  // Calculate avgDayRevenue for the selected period and for the current month
  let avgDayRevenue = 0;
  let avgDayRevenueSubtitle = '';
  let avgDayRevenueMonth = 0;
  if (dateFilter === 'today') {
    avgDayRevenue = totalRevenue;
    avgDayRevenueSubtitle = 'For current day';
    // Calculate current month's average day revenue
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Get all bills for this month
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const billsForMonth = bills.filter(bill => {
      let billDate: Date;
      if (bill.createdAt && typeof bill.createdAt === 'object' && 'toDate' in bill.createdAt) {
        billDate = (bill.createdAt as any).toDate();
      } else {
        billDate = new Date(bill.createdAt);
      }
      return billDate >= startOfMonth && billDate <= endOfMonth;
    });
    const revenueForMonth = billsForMonth.reduce((sum, bill) => sum + bill.totalAmount, 0);
    avgDayRevenueMonth = daysInMonth > 0 ? revenueForMonth / daysInMonth : 0;
  } else if (["month", "custom"].includes(dateFilter)) {
    const month = dateFilter === "month" ? new Date().getMonth() : (params.customDate?.month ?? new Date().getMonth());
    const year = dateFilter === "month" ? new Date().getFullYear() : (params.customDate?.year ?? new Date().getFullYear());
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    avgDayRevenue = daysInMonth > 0 ? totalRevenue / daysInMonth : 0;
    avgDayRevenueSubtitle = 'Per day in selected month';
    avgDayRevenueMonth = avgDayRevenue;
  } else {
    avgDayRevenue = 0;
    avgDayRevenueSubtitle = 'N/A';
    avgDayRevenueMonth = 0;
  }

  // Calculate avgMonthRevenue for year filter
  let avgMonthRevenue = 0;
  let avgMonthRevenueSubtitle = '';
  if (dateFilter === 'year') {
    const year = new Date().getFullYear();
    // Get all bills for this year
    const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
    const billsForYear = bills.filter(bill => {
      let billDate: Date;
      if (bill.createdAt && typeof bill.createdAt === 'object' && 'toDate' in bill.createdAt) {
        billDate = (bill.createdAt as any).toDate();
      } else {
        billDate = new Date(bill.createdAt);
      }
      return billDate >= startOfYear && billDate <= endOfYear;
    });
    const revenueForYear = billsForYear.reduce((sum, bill) => sum + bill.totalAmount, 0);
    // Calculate months with actual revenue
    // monthsWithRevenue was calculated previously but not used; removed for clarity
    const totalMonths = year === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;
    avgMonthRevenue = totalMonths > 0 ? revenueForYear / totalMonths : 0;
    avgMonthRevenueSubtitle = `Per month in ${year}`;
  } else if (dateFilter === 'customYear') {
    const year = params.customDate?.year ?? new Date().getFullYear();
    // Get all bills for the custom year
    const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
    const billsForYear = bills.filter(bill => {
      let billDate: Date;
      if (bill.createdAt && typeof bill.createdAt === 'object' && 'toDate' in bill.createdAt) {
        billDate = (bill.createdAt as any).toDate();
      } else {
        billDate = new Date(bill.createdAt);
      }
      return billDate >= startOfYear && billDate <= endOfYear;
    });
    const revenueForYear = billsForYear.reduce((sum, bill) => sum + bill.totalAmount, 0);
    // Calculate months with actual revenue
    // monthsWithRevenue was calculated previously but not used; removed for clarity
    const totalMonths = year === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;
    avgMonthRevenue = totalMonths > 0 ? revenueForYear / totalMonths : 0;
    avgMonthRevenueSubtitle = `Per month in ${year}`;
  } else {
    avgMonthRevenue = 0;
    avgMonthRevenueSubtitle = 'N/A';
  }

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    totalBills,
    avgBillValue,
    topSellingItems,
    profitMargin,
    rawMaterialExpense,
    upadAsExpense,
    staffSalaryExpense: showStaffSalaryInExpense ? staffPaidSalary : 0,
    avgDayRevenue,
    avgDayRevenueSubtitle,
    avgDayRevenueMonth,
    avgMonthRevenue,
    avgMonthRevenueSubtitle
  };
}; 