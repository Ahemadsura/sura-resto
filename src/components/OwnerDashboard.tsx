import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AppBar,
  Toolbar,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Divider,
  Switch,
  FormControlLabel,
  InputAdornment,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Menu,
  Snackbar,
  Tooltip
} from '@mui/material';
import { 
  Add, 
  Edit, 
  Delete, 
  Logout, 
  Assessment, 
  Restaurant,
  TrendingUp,
  MonetizationOn,
  Search,
  Refresh,
  Dashboard,
  MenuBook,
  Receipt,
  ShoppingCart,
  DateRange,
  Visibility,
  AttachMoney,
  TrendingDown,
  People
} from '@mui/icons-material';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../config/firebase';
import { MenuItem as MenuItemType, Bill } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { saveToLocalStorage, getFromLocalStorage } from '../utils/helpers';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Bar, BarChart } from 'recharts';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import CircularProgress from '@mui/material/CircularProgress';
import Papa from 'papaparse';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  createdBy: string;
  createdAt: Date;
}

// Types
type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom' | 'customYear' | 'customDay' | 'customRange';

interface DateRange {
  start: string;
  end: string;
}

interface CustomDate {
  month: number;
  year: number;
}

interface CustomDateRange {
  startDate: string;
  endDate: string;
}

// Add this type above the OwnerDashboard component for clarity
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

// Add new user management types
interface RestaurantUser {
  id: string;
  email: string;
  displayName: string;
  role: 'owner' | 'manager';
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  createdBy: string;
}

interface UserFormData {
  email: string;
  password: string;
  displayName: string;
  role: 'manager';
}

const drawerWidth = 240;

const OwnerDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  
  // Menu Management
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
  const [menuFormData, setMenuFormData] = useState({
    itemNo: '',
    name: '',
    description: '',
    category: '',
    privatePrice: '',
    loadingPrice: '',
    acHallPrice: '',
    isAvailable: true
  });
  
  // Expense Management
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  // Analytics and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [dateRange, setDateRange] = useState<DateRange>({ start: '', end: '' });
  const [customDate, setCustomDate] = useState<CustomDate>({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({ startDate: '', endDate: '' });
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalBills: 0,
    avgBillValue: 0,
    topSellingItems: [] as any[],
    profitMargin: 0,
    rawMaterialExpense: 0,
    upadAsExpense: 0,
    staffSalaryExpense: 0,
    avgDayRevenue: 0,
    avgDayRevenueSubtitle: '',
    avgDayRevenueMonth: 0,
    avgMonthRevenue: 0,
    avgMonthRevenueSubtitle: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const { currentUser, logout } = useAuth();

  // Add state for pagination
  const [menuPage, setMenuPage] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Add staff salary state
  const [staffList, setStaffList] = useState<StaffType[]>([]);
  const [staffForm, setStaffForm] = useState({ name: '', salary: '' });
  const [showStaffDialog, setShowStaffDialog] = useState(false);

  // Add alert state for salary reminders
  const [salaryAlert, setSalaryAlert] = useState('');

  // User Management State
  const [restaurantUsers, setRestaurantUsers] = useState<RestaurantUser[]>([]);
  const [userFormData, setUserFormData] = useState<UserFormData>({
    email: '',
    password: '',
    displayName: '',
    role: 'manager'
  });
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [loadingUserOperation, setLoadingUserOperation] = useState(false);

  // Move these lines above calculateAnalytics:
  const totalStaffSalary = staffList.reduce((sum, s) => sum + s.salary, 0);

  // Update filteredMenuItems to filter by selectedCategory and sort by itemNo
  const filteredMenuItems = useMemo<MenuItemType[]>(() => {
    const items = menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.itemNo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    // Sort by itemNo (try numeric, fallback to string)
    items.sort((a, b) => {
      const aNum = parseInt(a.itemNo, 10);
      const bNum = parseInt(b.itemNo, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return a.itemNo.localeCompare(b.itemNo);
    });
    return items;
  }, [menuItems, searchTerm, selectedCategory]);

  // Update paginatedMenuItems to use filteredMenuItems
  const paginatedMenuItems = filteredMenuItems.slice(menuPage * 4, (menuPage + 1) * 4);
  const maxMenuPage = Math.max(0, Math.ceil(filteredMenuItems.length / 4) - 1);

  // Reset to first page when selectedCategory changes
  useEffect(() => {
    setMenuPage(0);
  }, [selectedCategory]);

  // Use dynamic restaurantId from currentUser
  const restaurantId = currentUser?.restaurantId;

  useEffect(() => {
    const storedMenuItems = getFromLocalStorage('owner_menuItems');
    const storedBills = getFromLocalStorage('owner_bills');
    const storedExpenses = getFromLocalStorage('owner_expenses');
    if (storedMenuItems) setMenuItems(storedMenuItems);
    if (storedBills) setBills(storedBills);
    if (storedExpenses) setExpenses(storedExpenses);
  }, []);

  // Fetch data when restaurantId becomes available
  useEffect(() => {
    if (restaurantId) {
      fetchCategories();
      fetchMenuItems();
      fetchBills();
      fetchExpenses();
      fetchStaffList();
    }
  }, [restaurantId]);

  useEffect(() => {
    saveToLocalStorage('owner_menuItems', menuItems);
  }, [menuItems]);
  useEffect(() => {
    saveToLocalStorage('owner_bills', bills);
  }, [bills]);
  useEffect(() => {
    saveToLocalStorage('owner_expenses', expenses);
  }, [expenses]);

  useEffect(() => {
    calculateAnalytics();
  }, [bills, expenses, dateFilter, customDate, staffList]);

  useEffect(() => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    if ([lastDay, lastDay - 1, lastDay - 2].includes(today.getDate())) {
      setSalaryAlert('Reminder: Staff salary payment is due soon!');
    } else {
      setSalaryAlert('');
    }
    // Monthly reset logic: only update paid/pendingMonths/prepaid, never clear staffList
    const lastResetMonth = localStorage.getItem('lastSalaryResetMonth');
    if (lastResetMonth !== `${today.getFullYear()}-${today.getMonth()}`) {
      setStaffList(prev => prev.map(staff => ({
        ...staff,
        paid: false,
        pendingMonths: staff.paid ? staff.pendingMonths : staff.pendingMonths + 1,
        prepaid: staff.prepaid,
      })));
      localStorage.setItem('lastSalaryResetMonth', `${today.getFullYear()}-${today.getMonth()}`);
    }
  }, []);

  // Persist staffList to localStorage and restore on page load
  useEffect(() => {
    const storedStaffList = getFromLocalStorage('owner_staffList');
    if (storedStaffList) setStaffList(storedStaffList);
  }, []);
  useEffect(() => {
    saveToLocalStorage('owner_staffList', staffList);
  }, [staffList]);

  // Update fetchMenuItems
  const fetchMenuItems = async () => {
    if (!restaurantId) return;
    try {
      const querySnapshot = await getDocs(collection(db, 'restaurantProfile', restaurantId, 'menuItems'));
      const items: MenuItemType[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as MenuItemType);
      });
      setMenuItems(items);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setError('Failed to fetch menu items');
    }
  };

  const fetchBills = async () => {
    if (!restaurantId) return;
    try {
      const querySnapshot = await getDocs(collection(db, 'restaurantProfile', restaurantId, 'bills'));
      const fetchedBills: Bill[] = [];
      querySnapshot.forEach((doc) => {
        fetchedBills.push({ id: doc.id, ...doc.data() } as Bill);
      });
      setBills(fetchedBills);
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  };

  const fetchExpenses = async () => {
    if (!restaurantId) return;
    try {
      const querySnapshot = await getDocs(
        collection(db, 'restaurantProfile', restaurantId, 'expenses')
      );
      const fetchedExpenses: Expense[] = [];
      querySnapshot.forEach((doc) => {
        fetchedExpenses.push({ id: doc.id, ...doc.data() } as Expense);
      });
      console.log('Fetched expenses:', fetchedExpenses);
      setExpenses(fetchedExpenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };
    // Add state for custom day/month/year selection
  const [customDay, setCustomDay] = useState<number | null>(null);
  const [customMonth, setCustomMonth] = useState<number | null>(null);
  const [customYear, setCustomYear] = useState<number>(new Date().getFullYear());

  const getDateRange = (filter: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
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
        const startOfCustomMonth = new Date(customDate.year, customDate.month, 1);
        const endOfCustomMonth = new Date(customDate.year, customDate.month + 1, 0);
        endOfCustomMonth.setHours(23, 59, 59, 999);
        return {
          start: startOfCustomMonth,
          end: endOfCustomMonth,
          label: `${startOfCustomMonth.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} (${startOfCustomMonth.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${endOfCustomMonth.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})`
        };
      
      case 'customYear':
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
        if (customDateRange.startDate && customDateRange.endDate) {
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

  const calculateAnalytics = useCallback(() => {
    const { start, end, label } = getDateRange(dateFilter);
    
    // Set date range for display
    setDateRange({
      start: start.toLocaleDateString(),
      end: end.toLocaleDateString()
    });
    
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
        const year = dateFilter === "year" ? new Date().getFullYear() : customDate.year;
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
    relevantBills.forEach(bill => {
      bill.items.forEach(item => {
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
      const month = dateFilter === "month" ? new Date().getMonth() : customDate.month;
      const year = dateFilter === "month" ? new Date().getFullYear() : customDate.year;
      staffPaidSalary = staffList.reduce((sum, staff) =>
        sum + staff.paymentHistory.filter(h => h.type === 'salary' && h.month === month && h.year === year).reduce((a, h) => a + h.amount, 0)
      , 0);
    } else if (["year", "customYear"].includes(dateFilter)) {
      // For the selected year
      const year = dateFilter === "year" ? new Date().getFullYear() : customDate.year;
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
      const month = dateFilter === "month" ? new Date().getMonth() : customDate.month;
      const year = dateFilter === "month" ? new Date().getFullYear() : customDate.year;
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
      const currentMonth = new Date().getMonth() + 1; // months with revenue so far
      avgMonthRevenue = currentMonth > 0 ? revenueForYear / currentMonth : 0;
      avgMonthRevenueSubtitle = `Per month in ${year}`;
    } else if (dateFilter === 'customYear') {
      const year = customDate.year;
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
      const monthsWithRevenue = new Set();
      billsForYear.forEach(bill => {
        let billDate: Date;
        if (bill.createdAt && typeof bill.createdAt === 'object' && 'toDate' in bill.createdAt) {
          billDate = (bill.createdAt as any).toDate();
        } else {
          billDate = new Date(bill.createdAt);
        }
        monthsWithRevenue.add(billDate.getMonth());
      });
      const totalMonths = year === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;
      avgMonthRevenue = totalMonths > 0 ? revenueForYear / totalMonths : 0;
      avgMonthRevenueSubtitle = `Per month in ${year}`;
    } else {
      avgMonthRevenue = 0;
      avgMonthRevenueSubtitle = 'N/A';
    }

    setAnalyticsData({
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
    });
    // --- Day-wise revenue for custom month ---
    if (dateFilter === 'custom') {
      const daysInMonth = new Date(customDate.year, customDate.month + 1, 0).getDate();
      const dayWise: { date: string; revenue: number; billsCount: number; avgBillValue: number }[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dayStart = new Date(customDate.year, customDate.month, d, 0, 0, 0, 0);
        const dayEnd = new Date(customDate.year, customDate.month, d, 23, 59, 59, 999);
        const billsForDay = relevantBills.filter(bill => {
          let billDate: Date;
          if (bill.createdAt && typeof bill.createdAt === 'object' && 'toDate' in bill.createdAt) {
            billDate = (bill.createdAt as any).toDate();
          } else {
            billDate = new Date(bill.createdAt);
          }
          return billDate >= dayStart && billDate <= dayEnd;
        });
        const revenue = billsForDay.reduce((sum, bill) => sum + bill.totalAmount, 0);
        const billsCount = billsForDay.length;
        const avgBillValue = billsCount > 0 ? revenue / billsCount : 0;
        dayWise.push({
          date: dayStart.toLocaleDateString(),
          revenue,
          billsCount,
          avgBillValue
        });
      }
      setCustomDayWiseRevenue(dayWise);
    } else {
      setCustomDayWiseRevenue([]);
    }
  }, [bills, expenses, dateFilter, customDate, totalStaffSalary]);

  // Function to get current day bills only (kept for backward compatibility if needed)
  const getCurrentDayBills = () => {
    const currentDay = new Date();
    const startOfCurrentDay = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate());
    const endOfCurrentDay = new Date(startOfCurrentDay);
    endOfCurrentDay.setHours(23, 59, 59, 999);
    
    return bills.filter(bill => {
      let billDate: Date;
        if (bill.createdAt && typeof bill.createdAt === 'object' && 'toDate' in bill.createdAt) {
        billDate = (bill.createdAt as any).toDate();
        } else {
        billDate = new Date(bill.createdAt);
      }
      return billDate >= startOfCurrentDay && billDate <= endOfCurrentDay;
    });
  };

  // Menu Management Functions
  const handleMenuDialogOpen = (item?: MenuItemType) => {
    if (item) {
      setEditingItem(item);
      setMenuFormData({
        itemNo: item.itemNo,
        name: item.name,
        description: (item as any).description || '',
        category: (item as any).category || '',
        privatePrice: item.privatePrice.toString(),
        loadingPrice: item.loadingPrice.toString(),
        acHallPrice: ((item as any).acHallPrice || 0).toString(),
        isAvailable: (item as any).isAvailable !== false
      });
    } else {
      setEditingItem(null);
      setMenuFormData({
        itemNo: '',
        name: '',
        description: '',
        category: '',
        privatePrice: '',
        loadingPrice: '',
        acHallPrice: '',
        isAvailable: true
      });
    }
    setIsMenuDialogOpen(true);
  };

  const handleMenuDialogClose = () => {
    setIsMenuDialogOpen(false);
    setEditingItem(null);
  };

  const handleSaveMenuItem = async () => {
    if (!menuFormData.itemNo || !menuFormData.name || !menuFormData.privatePrice || !menuFormData.loadingPrice) {
      setError('Please fill all required fields');
      return;
    }
    if (!restaurantId) {
      setError('Restaurant ID not found. Please re-login.');
      return;
    }

    // Check for duplicate item number and name
    const duplicateItemNo = menuItems.find(item => 
      item.itemNo.toLowerCase() === menuFormData.itemNo.toLowerCase() && 
      (!editingItem || item.id !== editingItem.id)
    );
    
    // Enhanced name validation - remove all spaces and convert to lowercase for comparison
    const normalizeItemName = (name: string) => name.toLowerCase().replace(/\s+/g, '');
    const newItemNameNormalized = normalizeItemName(menuFormData.name);
    
    const duplicateName = menuItems.find(item => 
      normalizeItemName(item.name) === newItemNameNormalized && 
      (!editingItem || item.id !== editingItem.id)
    );

    if (duplicateItemNo) {
      setError(`Item Number "${menuFormData.itemNo}" is already used. Please choose a different item number.`);
      return;
    }

    if (duplicateName) {
      setError(`Item Name "${menuFormData.name}" already exists. Please choose a different item name.`);
      return;
    }

    setLoading(true);
    try {
      const itemData = {
        itemNo: menuFormData.itemNo,
        name: menuFormData.name,
        description: menuFormData.description,
        category: menuFormData.category,
        privatePrice: parseFloat(menuFormData.privatePrice),
        loadingPrice: parseFloat(menuFormData.loadingPrice),
        acHallPrice: parseFloat(menuFormData.acHallPrice) || 0,
        isAvailable: menuFormData.isAvailable,
        updatedAt: new Date()
      };

      if (editingItem) {
        await updateDoc(doc(db, 'restaurantProfile', restaurantId, 'menuItems', editingItem.id), itemData);
        setSuccess('Menu item updated successfully!');
      } else {
        await addDoc(collection(db, 'restaurantProfile', restaurantId, 'menuItems'), {
          ...itemData,
          createdAt: new Date()
        });
        setSuccess('Menu item added successfully!');
      }

      handleMenuDialogClose();
      fetchMenuItems();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving menu item:', error);
      setError('Failed to save menu item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!restaurantId) {
      setError('Restaurant ID not found. Please re-login.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'restaurantProfile', restaurantId, 'menuItems', id));
        setSuccess('Menu item deleted successfully!');
        fetchMenuItems();
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        console.error('Error deleting menu item:', error);
        setError('Failed to delete menu item');
      }
    }
  };

  // Expense Management Functions
  const handleSaveExpense = async () => {
    if (!expenseFormData.category || !expenseFormData.amount || !expenseFormData.date) {
      setError('Please fill all required fields');
      return;
    }
    if (!restaurantId) {
      setError('Restaurant ID not found. Please re-login.');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'restaurantProfile', restaurantId, 'expenses'), {
        category: expenseFormData.category,
        description: expenseFormData.description,
        amount: parseFloat(expenseFormData.amount),
        date: expenseFormData.date,
        createdBy: currentUser?.uid,
        createdAt: new Date()
      });

      setSuccess('Expense added successfully!');
      setIsExpenseDialogOpen(false);
      setExpenseFormData({
        category: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchExpenses();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving expense:', error);
      setError('Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Revenue Dashboard', icon: <Dashboard /> },
    { id: 'menu', label: 'Menu Management', icon: <MenuBook /> },
    { id: 'expenses', label: 'Raw Material Expenses', icon: <ShoppingCart /> },
    { id: 'bills', label: 'Bill History', icon: <Receipt /> },
    { id: 'staff', label: 'Staff Salary', icon: <MonetizationOn /> },
    { id: 'users', label: 'User Management', icon: <People /> },
  ];

  // Define menu categories - Replace static with dynamic
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Default categories for new restaurants - removed as per user request
  const DEFAULT_CATEGORIES: string[] = [];

  // Fetch categories from Firestore
  const fetchCategories = async () => {
    if (!restaurantId) return;
    try {
      const docRef = doc(db, 'restaurantProfile', restaurantId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().categories) {
        setCategories(docSnap.data().categories);
      } else {
        // No categories exist - start with empty array (categories will be added from CSV import)
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]); // Start with empty categories instead of defaults
    }
  };

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !restaurantId) return;
    
    const trimmedName = newCategoryName.trim();
    
    // Check if category already exists (case insensitive)
    if (categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase())) {
      setError('Category already exists!');
      return;
    }

    try {
      const updatedCategories = [...categories, trimmedName];
      const docRef = doc(db, 'restaurantProfile', restaurantId);
      await updateDoc(docRef, { categories: updatedCategories });
      
      setCategories(updatedCategories);
      setNewCategoryName('');
      setCategoryDialogOpen(false);
      setSuccess(`Category "${trimmedName}" added successfully!`);
    } catch (error) {
      console.error('Error adding category:', error);
      setError('Failed to add category');
    }
  };

  // Delete category (with safety checks)
  const handleDeleteCategory = async (categoryToDelete: string) => {
    if (!restaurantId) return;

    // Check if any menu items use this category
    const itemsUsingCategory = menuItems.filter(item => item.category === categoryToDelete);
    
    if (itemsUsingCategory.length > 0) {
      setError(`Cannot delete "${categoryToDelete}" - ${itemsUsingCategory.length} menu items are using this category`);
      return;
    }

    try {
      const updatedCategories = categories.filter(cat => cat !== categoryToDelete);
      const docRef = doc(db, 'restaurantProfile', restaurantId);
      await updateDoc(docRef, { categories: updatedCategories });
      
      setCategories(updatedCategories);
      setSuccess(`Category "${categoryToDelete}" deleted successfully!`);
    } catch (error) {
      console.error('Error deleting category:', error);
      setError('Failed to delete category');
    }
  };

  // Auto-add categories from CSV import
  const autoAddCategoriesFromCsv = async (csvCategories: string[]) => {
    if (!restaurantId) return;

    const newCategories = csvCategories.filter(csvCat => 
      csvCat && !categories.some(existingCat => 
        existingCat.toLowerCase() === csvCat.toLowerCase()
      )
    );

    if (newCategories.length > 0) {
      try {
        const updatedCategories = [...categories, ...newCategories];
        const docRef = doc(db, 'restaurantProfile', restaurantId);
        await updateDoc(docRef, { categories: updatedCategories });
        
        setCategories(updatedCategories);
        setSuccess(`Auto-added ${newCategories.length} new categories: ${newCategories.join(', ')}`);
      } catch (error) {
        console.error('Error auto-adding categories:', error);
      }
    }
  };

  // Filter expenses to use global filter instead of just today's expenses
  const todayForExpenses = new Date();
  const startOfDayForExpenses = new Date(todayForExpenses.getFullYear(), todayForExpenses.getMonth(), todayForExpenses.getDate());
  const endOfDayForExpenses = new Date(startOfDayForExpenses);
  endOfDayForExpenses.setHours(23, 59, 59, 999);
  
  // Use filtered expenses based on global dateFilter
  const filteredExpensesForDisplay = expenses.filter(expense => {
    const { start, end } = getDateRange(dateFilter);
    const expenseDate = new Date(expense.date);
    const inRange = expenseDate >= start && expenseDate <= end;
    console.log('Filtering expense:', expense.date, 'in range:', inRange, 'start:', start, 'end:', end);
    return inRange;
  });
  console.log('All expenses:', expenses.length, 'Filtered expenses:', filteredExpensesForDisplay.length);
  const totalExpensesForDisplay = filteredExpensesForDisplay.reduce((sum: number, expense: Expense) => sum + expense.amount, 0);
  
  // Keep todaysExpenses for any legacy code that might need it
  const todaysExpenses: Expense[] = expenses.filter((exp: Expense) => {
    const expDate = new Date(exp.date);
    return expDate >= startOfDayForExpenses && expDate <= endOfDayForExpenses;
  });

  // Staff salary form handlers
  const handleAddStaff = async () => {
    if (!staffForm.name || !staffForm.salary) return;
    const newStaff: any = {
      name: staffForm.name,
      salary: parseFloat(staffForm.salary),
      paid: false,
      joinDate: new Date().toISOString().split('T')[0],
      pendingMonths: 0,
      prepaid: [],
      leave: 0,
      paymentHistory: []
    };
    // Only add lastPaidDate if it is a string (not undefined)
    // (For new staff, just omit it)
    await addStaffToFirestore(newStaff);
    setStaffForm({ name: '', salary: '' });
    setShowStaffDialog(false);
  };
  const handleMarkPaid = async (index: number, months: number = 1) => {
    const staff = staffList[index];
    if (!staff.id) return;
    const now = new Date();
    const nowMonth = now.getMonth();
    const nowYear = now.getFullYear();
    const dailyRate = staff.salary / 30;
    const leaveDeduction = (staff.leave || 0) * dailyRate;
    const upadForMonth = (staff.prepaid || []).find(p => p.month === nowMonth && p.year === nowYear)?.amount || 0;
    const paidAmount = Math.max(0, Math.floor(staff.salary - upadForMonth - leaveDeduction));
    // Remove upad for current month after payment
    const newPrepaid = (staff.prepaid || []).filter(p => !(p.month === nowMonth && p.year === nowYear));
    const newPaymentHistory = [
      ...staff.paymentHistory,
      {
        month: nowMonth,
        year: nowYear,
        amount: paidAmount,
        paidDate: now.toISOString().split('T')[0],
        type: 'salary' as 'salary'
      }
    ];
    // Add leave to leaveHistory
    const newLeaveHistory = [
      ...(staff.leaveHistory || []),
      { month: nowMonth, year: nowYear, days: staff.leave || 0 }
    ];
    const safePaymentHistory2 = newPaymentHistory.map(h => ({ ...h, type: h.type as 'salary' | 'upad' }));
    const updated = {
      ...staff,
      paid: true,
      lastPaidDate: now.toISOString().split('T')[0],
      pendingMonths: Math.max(0, staff.pendingMonths - months),
      prepaid: newPrepaid,
      paymentHistory: safePaymentHistory2,
      leaveHistory: newLeaveHistory,
      leave: 0 // reset leave after payment
    };
    await updateStaffInFirestore(staff.id, updated);
  };
  const handleBulkPay = (index: number) => {
    const staff = staffList[index];
    if (staff.pendingMonths > 0) {
      handleMarkPaid(index, staff.pendingMonths);
    }
  };
  const handlePrepaid = async (index: number, amount: number) => {
    const staff = staffList[index];
    if (!staff.id) return;
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    let newPrepaid = [...(staff.prepaid || [])];
    const idx = newPrepaid.findIndex(p => p.month === month && p.year === year);
    if (idx >= 0) {
      newPrepaid[idx].amount += amount;
    } else {
      newPrepaid.push({ month, year, amount });
    }
    // Add upad to paymentHistory
    const newPaymentHistory = [
      ...staff.paymentHistory,
      {
        month,
        year,
        amount,
        paidDate: now.toISOString().split('T')[0],
        type: 'upad' as 'upad'
      }
    ];
    const safePaymentHistory = newPaymentHistory.map(h => ({ ...h, type: h.type as 'salary' | 'upad' }));
    await updateStaffInFirestore(staff.id, { prepaid: newPrepaid, paymentHistory: safePaymentHistory });
  };
  const handleRemoveStaff = async (index: number) => {
    const staff = staffList[index];
    if (!staff.id) return;
    await removeStaffFromFirestore(staff.id);
  };

  // Calculate total staff salary paid for the selected period
  const staffPaidSalary = staffList.reduce((sum, s) =>
    sum + s.paymentHistory.filter(h => h.month === customDate.month && h.year === customDate.year).reduce((a, h) => a + h.amount, 0), 0
  );

  // In the staff table, display joinDate, lastPaidDate, pendingMonths, prepaid, and a button to view payment history
  // Add UI for bulk and prepaid payments
  // Add a dialog to show payment history for a staff member
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyStaffIndex, setHistoryStaffIndex] = useState<number | null>(null);

  // Add state for upad dialog
  const [showUpadDialog, setShowUpadDialog] = useState(false);
  const [upadStaffIndex, setUpadStaffIndex] = useState<number | null>(null);
  const [upadAmount, setUpadAmount] = useState('');

  // Calculate months since joining
  const getMonthsSinceJoining = (joinDate: string) => {
    const join = new Date(joinDate);
    const now = new Date();
    return (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth()) + 1;
  };

  // Calculate total amount left to pay (for current month only)
  const getAmountLeftToPay = (staff: StaffType) => {
    const now = new Date();
    const nowMonth = now.getMonth();
    const nowYear = now.getFullYear();
    // Check if paid for current month
    if (staff.paid && staff.lastPaidDate) {
      const paidDate = new Date(staff.lastPaidDate);
      if (paidDate.getFullYear() === nowYear && paidDate.getMonth() === nowMonth) {
        return 0;
      }
    }
    const dailyRate = staff.salary / 30;
    const leaveDeduction = (staff.leave || 0) * dailyRate;
    const upadForMonth = (staff.prepaid || []).find(p => p.month === nowMonth && p.year === nowYear)?.amount || 0;
    const amountLeft = Math.max(0, Math.floor(staff.salary - upadForMonth - leaveDeduction));
    return amountLeft;
  };

  // Update handlePrepaid to handle Upad dialog
  const handleUpad = (index: number) => {
    setUpadStaffIndex(index);
    setUpadAmount('');
    setShowUpadDialog(true);
  };
  const handleUpadSubmit = () => {
    if (upadStaffIndex !== null && upadAmount) {
      handlePrepaid(upadStaffIndex, parseFloat(upadAmount));
      setShowUpadDialog(false);
    }
  };

  // After getAmountLeftToPay definition:
  const unpaidStaffSalary = staffList.reduce((sum, staff) => sum + getAmountLeftToPay(staff), 0);

  // --- Firestore CRUD for staff ---
  const fetchStaffList = async () => {
    if (!restaurantId) return;
    try {
      const querySnapshot = await getDocs(collection(db, 'restaurantProfile', restaurantId, 'staff'));
      const staffArr: any[] = [];
      querySnapshot.forEach((doc) => {
        staffArr.push({ id: doc.id, ...doc.data() });
      });
      setStaffList(staffArr);
    } catch (err) {
      setError('Failed to fetch staff list');
      console.error('Error fetching staff:', err);
    }
  };

  const addStaffToFirestore = async (staff: Omit<StaffType, 'id'>) => {
    if (!restaurantId) {
      setError('Restaurant ID not found. Please re-login.');
      return;
    }
    try {
      const docRef = await addDoc(collection(db, 'restaurantProfile', restaurantId, 'staff'), staff);
      setStaffList((prev) => [...prev, { ...staff, id: docRef.id }]);
    } catch (err) {
      setError('Failed to add staff');
      console.error('Error adding staff:', err);
    }
  };

  const updateStaffInFirestore = async (id: string, data: Partial<StaffType>) => {
    if (!restaurantId) {
      setError('Restaurant ID not found. Please re-login.');
      return;
    }
    try {
      await updateDoc(doc(db, 'restaurantProfile', restaurantId, 'staff', id), data);
      setStaffList((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
    } catch (err) {
      setError('Failed to update staff');
      console.error('Error updating staff:', err);
    }
  };

  const removeStaffFromFirestore = async (id: string) => {
    if (!restaurantId) {
      setError('Restaurant ID not found. Please re-login.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'restaurantProfile', restaurantId, 'staff', id));
      setStaffList((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError('Failed to remove staff');
      console.error('Error removing staff:', err);
    }
  };

  // On mount, fetch staff from Firestore
  useEffect(() => {
    fetchStaffList();
    fetchRestaurantUsers(); // Also fetch users
  }, []);

  // User Management Functions
  const fetchRestaurantUsers = async () => {
    try {
      if (!currentUser?.restaurantId) return;
      const usersCollection = collection(db, 'restaurantProfile', currentUser.restaurantId, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const userData: RestaurantUser[] = [];
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        userData.push({ 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLogin: data.lastLogin?.toDate(),
          // Fix: Ensure owners are always active if isActive is undefined
          isActive: data.isActive !== undefined ? data.isActive : (data.role === 'owner' ? true : false)
        } as RestaurantUser);
      });
      setRestaurantUsers(userData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch restaurant users');
    }
  };

  // Function to fix owner status
  const fixOwnerStatus = async () => {
    try {
      if (!currentUser?.restaurantId) return;
      
      // Update current user's isActive to true
      await updateDoc(
        doc(db, 'restaurantProfile', currentUser.restaurantId, 'users', currentUser.uid),
        { isActive: true }
      );
      
      setSuccess('Owner status updated successfully!');
      await fetchRestaurantUsers();
    } catch (error) {
      console.error('Error fixing owner status:', error);
      setError('Failed to update owner status');
    }
  };

  const handleAddUser = async () => {
    try {
      setLoadingUserOperation(true);
      
      if (!userFormData.email || !userFormData.password || !userFormData.displayName) {
        setError('Please fill in all required fields');
        return;
      }

      if (!currentUser?.restaurantId) {
        setError('Restaurant ID not found');
        return;
      }

      // Check manager limit (maximum 2 managers)
      const activeManagers = restaurantUsers.filter(user => user.role === 'manager' && user.isActive);
      if (activeManagers.length >= 2) {
        setError('Maximum limit of 2 managers reached. Please remove an existing manager before adding a new one.');
        return;
      }

      // Check if user already exists
      const existingUser = restaurantUsers.find(user => user.email === userFormData.email);
      if (existingUser) {
        setError('A user with this email already exists');
        return;
      }

      // Call Cloud Function to create user
      const functions = getFunctions();
      const createManagerUser = httpsCallable(functions, 'createManagerUser');
      
      const result = await createManagerUser({
        email: userFormData.email,
        password: userFormData.password,
        displayName: userFormData.displayName
      });

      setSuccess(`Manager ${userFormData.displayName} created successfully! They can now login with their credentials.`);
      setUserFormData({ email: '', password: '', displayName: '', role: 'manager' });
      setShowUserDialog(false);
      await fetchRestaurantUsers();

    } catch (error: any) {
      console.error('Error adding user:', error);
      if (error.code === 'functions/already-exists') {
        setError('A user with this email already exists');
      } else if (error.code === 'functions/permission-denied') {
        setError('You do not have permission to add managers');
      } else if (error.code === 'functions/resource-exhausted') {
        setError('Maximum limit of 2 managers reached. Please remove an existing manager before adding a new one.');
      } else {
        setError('Failed to add user: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setLoadingUserOperation(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      // If trying to activate a manager, check the limit first
      if (!currentStatus) {
        const activeManagers = restaurantUsers.filter(user => user.role === 'manager' && user.isActive);
        if (activeManagers.length >= 2) {
          setError('Maximum limit of 2 active managers reached. Please deactivate an existing manager before activating this one.');
          return;
        }
      }

      const functions = getFunctions();
      const toggleManagerStatus = httpsCallable(functions, 'toggleManagerStatus');
      
      await toggleManagerStatus({
        userId: userId,
        isActive: !currentStatus
      });
      
      setSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      await fetchRestaurantUsers();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      if (error.code === 'functions/resource-exhausted') {
        setError('Maximum limit of 2 active managers reached. Please deactivate an existing manager before activating this one.');
      } else {
      setError('Failed to update user status: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const functions = getFunctions();
      const removeManagerUser = httpsCallable(functions, 'removeManagerUser');
      
      await removeManagerUser({ userId: userId });
      setSuccess(`${userName} removed successfully`);
      await fetchRestaurantUsers();
    } catch (error: any) {
      console.error('Error removing user:', error);
      setError('Failed to remove user: ' + (error.message || 'Unknown error'));
    }
  };

  // Staff Salary Section state additions
  const STAFFS_PER_PAGE = 5;
  const [staffPage, setStaffPage] = useState(0);
  const [actionAnchorEl, setActionAnchorEl] = useState<null | HTMLElement>(null);
  const [actionMenuIdx, setActionMenuIdx] = useState<number | null>(null);

  // Bill History pagination state
  const BILLS_PER_PAGE = 5;
  const [billPage, setBillPage] = useState(0);

  // Add state for day-wise revenue in custom month
  const [customDayWiseRevenue, setCustomDayWiseRevenue] = useState<{
    date: string;
    revenue: number;
    billsCount: number;
    avgBillValue: number;
  }[]>([]);

  // Add state for single day revenue selection
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedDayRevenue, setSelectedDayRevenue] = useState<{
    date: string;
    revenue: number;
    billsCount: number;
    avgBillValue: number;
  } | null>(null);

  // Add effect to calculate selected day revenue when selectedDay, customDate, or bills change
  useEffect(() => {
    if (selectedDay !== null) {
      const dayStart = new Date(customDate.year, customDate.month, selectedDay, 0, 0, 0, 0);
      const dayEnd = new Date(customDate.year, customDate.month, selectedDay, 23, 59, 59, 999);
      const billsForDay = bills.filter(bill => {
        let billDate: Date;
        if (bill.createdAt && typeof bill.createdAt === 'object' && 'toDate' in bill.createdAt) {
          billDate = (bill.createdAt as any).toDate();
        } else {
          billDate = new Date(bill.createdAt);
        }
        return billDate >= dayStart && billDate <= dayEnd;
      });
      const revenue = billsForDay.reduce((sum, bill) => sum + bill.totalAmount, 0);
      const billsCount = billsForDay.length;
      const avgBillValue = billsCount > 0 ? revenue / billsCount : 0;
      setSelectedDayRevenue({
        date: dayStart.toLocaleDateString(),
        revenue,
        billsCount,
        avgBillValue
      });
    } else {
      setSelectedDayRevenue(null);
    }
  }, [selectedDay, customDate, bills]);



  // Memoized filtered and paginated bills to avoid temporal dead zone issues
  const { filteredBills = [], paginatedBills = [], maxBillPage = 0 }: {
    filteredBills: Bill[];
    paginatedBills: Bill[];
    maxBillPage: number;
  } = useMemo(() => {
    // Inline date range logic to avoid function dependency issues
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start: Date, end: Date;
    
    switch (dateFilter) {
      case 'today':
        start = today;
        end = new Date(today);
        end.setHours(23, 59, 59, 999);
        break;
      
      case 'week':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay()); // Sunday
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        end.setHours(23, 59, 59, 999);
        break;
      
      case 'custom':
        start = new Date(customDate.year, customDate.month, 1);
        end = new Date(customDate.year, customDate.month + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      
      case 'customYear':
        start = new Date(customDate.year, 0, 1);
        end = new Date(customDate.year, 11, 31);
        end.setHours(23, 59, 59, 999);
        break;
      
      case 'customDay':
        const safeDay = customDay !== null ? customDay : today.getDate();
        const safeMonth = customMonth !== null ? customMonth : today.getMonth();
        const safeYear = customYear || today.getFullYear();
        start = new Date(safeYear, safeMonth, safeDay, 0, 0, 0, 0);
        end = new Date(safeYear, safeMonth, safeDay, 23, 59, 59, 999);
        break;
      case 'customRange':
        if (customDateRange.startDate && customDateRange.endDate) {
          start = new Date(customDateRange.startDate);
          end = new Date(customDateRange.endDate);
          end.setHours(23, 59, 59, 999);
        } else {
          // Fall back to today if dates not set
          start = today;
          end = new Date(today);
          end.setHours(23, 59, 59, 999);
        }
        break;
      
      default:
        start = today;
        end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
    }
    
    let filtered = bills.filter(bill => {
      let billDate: Date;
      if (bill.createdAt && typeof bill.createdAt === 'object' && 'toDate' in bill.createdAt) {
        billDate = (bill.createdAt as any).toDate();
      } else {
        billDate = new Date(bill.createdAt);
      }
      return billDate >= start && billDate <= end;
    });
    
    // Sort bills by createdAt descending
    filtered.sort((a, b) => {
      const aDate = a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt ? (a.createdAt as any).toDate() : new Date(a.createdAt);
      const bDate = b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt ? (b.createdAt as any).toDate() : new Date(b.createdAt);
      return bDate.getTime() - aDate.getTime();
    });
    
    const paginated = filtered.slice(billPage * BILLS_PER_PAGE, (billPage + 1) * BILLS_PER_PAGE);
    const maxPage = Math.max(0, Math.ceil(filtered.length / BILLS_PER_PAGE) - 1);
    
    return {
      filteredBills: filtered,
      paginatedBills: paginated,
      maxBillPage: maxPage
    };
  }, [bills, dateFilter, customDate, customDateRange, billPage]);

  // Reset to first page when dateFilter changes
  useEffect(() => {
    setBillPage(0);
  }, [dateFilter]);

  // Remove getDayWiseExpenses and add getDayWiseData
  const getDayWiseData = useCallback(() => {
    // Get the current date range
    const { start, end } = getDateRange(dateFilter);

    // Calculate number of days in the range
    const days = [];
    let current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days.map(dayObj => {
      const dayStart = new Date(dayObj);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayObj);
      dayEnd.setHours(23, 59, 59, 999);

      // Revenue
      const billsForDay = bills.filter(bill => {
        let billDate;
        if (bill.createdAt && typeof bill.createdAt === 'object' && 'toDate' in bill.createdAt) {
          billDate = (bill.createdAt as any).toDate();
        } else {
          billDate = new Date(bill.createdAt);
        }
        return billDate >= dayStart && billDate <= dayEnd;
      });
      const revenue = billsForDay.reduce((sum, bill) => sum + bill.totalAmount, 0);

      // Expenses
      const expensesForDay = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= dayStart && expDate <= dayEnd;
      });
      const expenseTotal = expensesForDay.reduce((sum, exp) => sum + exp.amount, 0);

      return {
        date: dayStart.toLocaleDateString(),
        revenue,
        expenses: expenseTotal,
      };
    });
  }, [bills, expenses, dateFilter, getDateRange]);

  // Add function to get monthly data for current year
  const getMonthlyData = useCallback(() => {
    const currentYear = new Date().getFullYear();
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    return months.map((month, index) => {
      const monthStart = new Date(currentYear, index, 1);
      const monthEnd = new Date(currentYear, index + 1, 0, 23, 59, 59, 999);

      // Revenue for the month
      const billsForMonth = bills.filter(bill => {
        let billDate;
        if (bill.createdAt && typeof bill.createdAt === 'object' && 'toDate' in bill.createdAt) {
          billDate = (bill.createdAt as any).toDate();
        } else {
          billDate = new Date(bill.createdAt);
        }
        return billDate >= monthStart && billDate <= monthEnd;
      });
      const revenue = billsForMonth.reduce((sum, bill) => sum + bill.totalAmount, 0);

      // Expenses for the month
      const expensesForMonth = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= monthStart && expDate <= monthEnd;
      });
      const expenseTotal = expensesForMonth.reduce((sum, exp) => sum + exp.amount, 0);

      return {
        month,
        revenue,
        expenses: expenseTotal,
      };
    });
  }, [bills, expenses]);

  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    address: '',
    gstin: '',
    phone: '',
    email: ''
  });

  // Fetch profile from Firestore
  const fetchProfile = async () => {
    if (!restaurantId) return;
    try {
      const docRef = doc(db, 'restaurantProfile', restaurantId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          name: data.name || '',
          address: data.address || '',
          gstin: data.gstin || '',
          phone: data.phone || '',
          email: data.email || ''
        });
      }
    } catch (err) {
      setError('Failed to fetch profile');
    }
  };
  // Save profile to Firestore
  const saveProfile = async () => {
    if (!restaurantId) return;
    try {
      const docRef = doc(db, 'restaurantProfile', restaurantId);
      await setDoc(docRef, profile);
      setShowProfileDialog(false);
      setSuccess('Profile updated!');
    } catch (err) {
      setError('Failed to save profile');
    }
  };
  useEffect(() => { fetchProfile(); }, []);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false); // for mobile drawer

  // Effect: If amount left to pay is 0, set paid=true for current month
  React.useEffect(() => {
    setStaffList(prevList => prevList.map(staff => {
      const now = new Date();
      const nowMonth = now.getMonth();
      const nowYear = now.getFullYear();
      const amountLeft = getAmountLeftToPay(staff);
      // Only auto-mark as paid if not already marked for this month
      if (amountLeft === 0 && (!staff.paid || !staff.lastPaidDate || new Date(staff.lastPaidDate).getMonth() !== nowMonth || new Date(staff.lastPaidDate).getFullYear() !== nowYear)) {
        return {
          ...staff,
          paid: true,
          lastPaidDate: now.toISOString().split('T')[0],
        };
      }
      return staff;
    }));
  }, [staffList]);

  // Utility functions to get totals for a staff member
  const getStaffTotals = (
    staff: StaffType,
    { month, year }: { month?: number; year?: number } = {}
  ) => {
    const salaryPayments = staff.paymentHistory.filter((h: StaffType['paymentHistory'][number]) => h.type === 'salary');
    const upadPayments = staff.paymentHistory.filter((h: StaffType['paymentHistory'][number]) => h.type === 'upad');
    const leaveHistory = Array.isArray(staff.leaveHistory) ? staff.leaveHistory : [];
    let salaryTotal = 0, upadTotal = 0, leaveTotal = 0, daysWorked = 0;
    let totalDays = 0;
    if (month !== undefined && year !== undefined) {
      salaryTotal = salaryPayments.filter((h: StaffType['paymentHistory'][number]) => h.month === month && h.year === year).reduce((a: number, h: StaffType['paymentHistory'][number]) => a + h.amount, 0);
      upadTotal = upadPayments.filter((h: StaffType['paymentHistory'][number]) => h.month === month && h.year === year).reduce((a: number, h: StaffType['paymentHistory'][number]) => a + h.amount, 0);
      leaveTotal = leaveHistory.filter(l => l.month === month && l.year === year).reduce((a: number, l) => a + l.days, 0);
      totalDays = new Date(year, month + 1, 0).getDate();
    } else if (year !== undefined) {
      salaryTotal = salaryPayments.filter((h: StaffType['paymentHistory'][number]) => h.year === year).reduce((a: number, h: StaffType['paymentHistory'][number]) => a + h.amount, 0);
      upadTotal = upadPayments.filter((h: StaffType['paymentHistory'][number]) => h.year === year).reduce((a: number, h: StaffType['paymentHistory'][number]) => a + h.amount, 0);
      leaveTotal = leaveHistory.filter(l => l.year === year).reduce((a: number, l) => a + l.days, 0);
      // Sum days in all months for this year
      totalDays = Array.from(new Set(leaveHistory.filter(l => l.year === year).map(l => l.month))).reduce((sum, m) => sum + new Date(year, m + 1, 0).getDate(), 0);
    } else {
      salaryTotal = salaryPayments.reduce((a: number, h: StaffType['paymentHistory'][number]) => a + h.amount, 0);
      upadTotal = upadPayments.reduce((a: number, h: StaffType['paymentHistory'][number]) => a + h.amount, 0);
      leaveTotal = leaveHistory.reduce((a: number, l) => a + l.days, 0);
      // All time: sum all unique (month, year) pairs
      const uniquePeriods = Array.from(new Set(leaveHistory.map(l => `${l.year}-${l.month}`)));
      totalDays = uniquePeriods.reduce((sum, key) => {
        const [y, m] = key.split('-').map(Number);
        return sum + new Date(y, m + 1, 0).getDate();
      }, 0);
    }
    daysWorked = Math.max(0, totalDays - leaveTotal);
    return { salaryTotal, upadTotal, leaveTotal, daysWorked };
  };

  // In the OwnerDashboard component, find the Payment History Dialog (Dialog open={showHistoryDialog} ...)
  // Add state for selected month/year for summary
  const [summaryMonth, setSummaryMonth] = useState<number | null>(null);
  const [summaryYear, setSummaryYear] = useState<number | null>(null);

  // Add state for staff search in history dialog
  const [staffHistorySearch, setStaffHistorySearch] = useState('');

  // Remove pastMonthRevenueData and use month-wise revenue for the current year
  const [monthWiseRevenueData, setMonthWiseRevenueData] = useState<{ month: string; revenue: number; expense: number }[]>([]);
  const [hasMonthRevenue, setHasMonthRevenue] = useState(false);

  useEffect(() => {
    // Calculate month-wise revenue and expense for the current year
    const now = new Date();
    const year = now.getFullYear();
    const data: { month: string; revenue: number; expense: number }[] = [];
    let hasRevenue = false;
    for (let m = 0; m < 12; m++) {
      const start = new Date(year, m, 1, 0, 0, 0, 0);
      const end = new Date(year, m + 1, 0, 23, 59, 59, 999);
      // Revenue
      const billsForMonth = bills.filter(bill => {
        let billDate: Date;
        if (bill.createdAt && typeof bill.createdAt === 'object' && 'toDate' in bill.createdAt) {
          billDate = (bill.createdAt as any).toDate();
        } else {
          billDate = new Date(bill.createdAt);
        }
        return billDate >= start && billDate <= end;
      });
      const revenue = billsForMonth.reduce((sum, bill) => sum + bill.totalAmount, 0);
      if (revenue > 0) hasRevenue = true;
      // Expense
      const expensesForMonth = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= start && expDate <= end;
      });
      const expense = expensesForMonth.reduce((sum, exp) => sum + exp.amount, 0);
      data.push({
        month: start.toLocaleString('en-US', { month: 'short' }),
        revenue,
        expense,
      });
    }
    setMonthWiseRevenueData(data);
    setHasMonthRevenue(hasRevenue);
  }, [bills, expenses]);

  // Add state for refresh loading
  const [refreshing, setRefreshing] = useState(false);

  // Add a function to handle refresh with UI feedback
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCategories(),
        fetchMenuItems(),
        fetchBills(),
        fetchExpenses()
      ]);
      calculateAnalytics();
      setSuccess('Data refreshed!');
    } catch (e) {
      setError('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Add state for CSV import dialog and preview
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string>('');
  const [csvAllRows, setCsvAllRows] = useState<any[]>([]);

  // In the Import CSV dialog, add useEffect to parse and preview CSV when csvFile changes
  useEffect(() => {
    if (!csvFile) return;
    setCsvError('');
    setCsvPreview([]);
    setCsvAllRows([]);
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        if (results.errors && results.errors.length > 0) {
          setCsvError('CSV parsing error: ' + results.errors[0].message);
          return;
        }
        // Validate required columns
        const required = ['itemNo', 'name', 'category', 'privatePrice', 'loadingPrice'];
        const missing = required.filter(col => !results.meta.fields.includes(col));
        if (missing.length > 0) {
          setCsvError('Missing required columns: ' + missing.join(', '));
          return;
        }
        setCsvAllRows(results.data); // Store all rows for import
        setCsvPreview(results.data.slice(0, 10)); // Preview only first 10
      },
      error: (err: any) => {
        setCsvError('CSV parsing failed: ' + err.message);
      }
    });
  }, [csvFile]);

  // Add this function inside the component
  const handleImportCsvMenu = async () => {
    if (!csvAllRows.length) return;
    if (!restaurantId) {
      setCsvError('Restaurant ID not found. Please re-login.');
      return;
    }
    setLoading(true);
    let imported = 0;
    let failed = 0;
    let failedRows: any[] = [];
    
    // Auto-add new categories from CSV
    const csvCategories = Array.from(new Set(csvAllRows.map((row: any) => row.category).filter(Boolean)));
    await autoAddCategoriesFromCsv(csvCategories);
    
    // Build sets for duplicate detection
    const existingNos = new Set(menuItems.map(i => i.itemNo.toLowerCase()));
    const existingNames = new Set(menuItems.map(i => i.name.toLowerCase().replace(/\s+/g, '')));
    const csvNos = new Set<string>();
    const csvNames = new Set<string>();
    for (const row of csvAllRows) {
      // Validate required fields
      if (!row.itemNo || !row.name || !row.category || !row.privatePrice || !row.loadingPrice) {
        failed++;
        failedRows.push({ ...row, reason: 'Missing required fields' });
        continue;
      }
      // Validate numeric prices
      if (isNaN(Number(row.privatePrice)) || isNaN(Number(row.loadingPrice)) || (row.acHallPrice && isNaN(Number(row.acHallPrice)))) {
        failed++;
        failedRows.push({ ...row, reason: 'Invalid price values' });
        continue;
      }
      // Check for duplicates in existing menu
      if (existingNos.has(row.itemNo.toLowerCase())) {
        failed++;
        failedRows.push({ ...row, reason: 'Duplicate itemNo (already exists)' });
        continue;
      }
      if (existingNames.has(row.name.toLowerCase().replace(/\s+/g, ''))) {
        failed++;
        failedRows.push({ ...row, reason: 'Duplicate name (already exists)' });
        continue;
      }
      // Check for duplicates within CSV
      if (csvNos.has(row.itemNo.toLowerCase())) {
        failed++;
        failedRows.push({ ...row, reason: 'Duplicate itemNo (in CSV)' });
        continue;
      }
      if (csvNames.has(row.name.toLowerCase().replace(/\s+/g, ''))) {
        failed++;
        failedRows.push({ ...row, reason: 'Duplicate name (in CSV)' });
        continue;
      }
      csvNos.add(row.itemNo.toLowerCase());
      csvNames.add(row.name.toLowerCase().replace(/\s+/g, ''));
      // Prepare item data
      const itemData = {
        itemNo: row.itemNo,
        name: row.name,
        description: row.description || '',
        category: row.category,
        privatePrice: parseFloat(row.privatePrice),
        loadingPrice: parseFloat(row.loadingPrice),
        acHallPrice: row.acHallPrice ? parseFloat(row.acHallPrice) : 0,
        isAvailable: row.isAvailable !== undefined ? String(row.isAvailable).toLowerCase() !== 'false' : true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      try {
        await addDoc(collection(db, 'restaurantProfile', restaurantId, 'menuItems'), itemData);
        imported++;
      } catch (e) {
        failed++;
        failedRows.push({ ...row, reason: 'Firestore error' });
      }
    }
    // Refresh menu items
    await fetchMenuItems();
    setLoading(false);
    setSuccess(`Imported: ${imported}, Failed: ${failed}`);
    if (failedRows.length > 0) {
      setCsvError(`Some rows failed to import. See details below.`);
      setCsvPreview(failedRows.slice(0, 10));
    } else {
      setCsvDialogOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
      setCsvAllRows([]);
      setCsvError('');
    }
  };

  // Add this function inside the component
  const handleDownloadCsvTemplate = () => {
    const headers = ['itemNo', 'name', 'description', 'category', 'privatePrice', 'loadingPrice', 'acHallPrice', 'isAvailable'];
    const example = [
      ['101', 'Hara Bhara Kabab', 'Fried Pakoda with Stuffing', 'Starters', '120', '100', '120', 'TRUE'],
      ['102', 'Paneer Chilly', 'Paneer Chilly', 'Starters', '220', '160', '220', 'TRUE'],
      ['103', 'Crispy Corns', 'Fried Corns with Peri Peri Masala', 'Starters', '160', '160', '160', 'TRUE'],
      ['104', 'Masala Papad', 'Roasted Papad with Tomato, Onion, Masala', 'Starters', '80', '80', '80', 'TRUE']
    ];
    let csv = headers.join(',') + '\n';
    example.forEach(row => {
      csv += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Text Download function for revenue analytics
  const handleDownloadRevenueText = () => {
    const { start, end, label } = getDateRange(dateFilter);
    const currentDate = new Date().toLocaleDateString();

    // Create a beautiful HTML report
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${profile.name || 'SURA-RESTO by SURA'} - Revenue Analytics Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #7B2CBF 0%, #9B4DDB 100%); color: white; padding: 40px; text-align: center; }
        .header h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 10px; }
        .header p { font-size: 1.2rem; opacity: 0.9; }
        .period-info { background: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #e9ecef; }
        .period-info h2 { color: #7B2CBF; font-size: 1.5rem; margin-bottom: 10px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; padding: 30px; background: white; }
        .stat-card { background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border: 1px solid #e9ecef; border-radius: 12px; padding: 25px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .stat-number { font-size: 2.5rem; font-weight: 700; color: #7B2CBF; margin-bottom: 10px; }
        .stat-label { font-size: 1rem; color: #666; font-weight: 500; }
        .section { padding: 30px; border-bottom: 1px solid #e9ecef; }
        .section-title { font-size: 1.8rem; color: #7B2CBF; margin-bottom: 20px; }
        .profit-section { background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%); padding: 30px; border-bottom: 1px solid #e9ecef; }
        .profit-title { font-size: 1.8rem; color: #2e7d32; margin-bottom: 20px; }
        .profit-value { font-size: 2.5rem; font-weight: 700; color: #2e7d32; margin-bottom: 10px; }
        .profit-margin { font-size: 1.2rem; color: #4caf50; }
        .items-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin-top: 20px; }
        .item-card { background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .item-name { font-weight: 600; color: #7B2CBF; margin-bottom: 5px; }
        .item-details { color: #666; font-size: 0.9rem; }
        .footer { background: #2c3e50; color: white; padding: 30px; text-align: center; }
        .footer p { margin-bottom: 10px; }
        .generated-date { font-size: 0.9rem; opacity: 0.8; }
        .revenue-expense-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
        .revenue-card, .expense-card { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .revenue-card { border-left: 4px solid #4caf50; }
        .expense-card { border-left: 4px solid #f44336; }
        .card-title { font-size: 1.2rem; font-weight: 600; margin-bottom: 15px; }
        .revenue-card .card-title { color: #4caf50; }
        .expense-card .card-title { color: #f44336; }
        .amount { font-size: 1.5rem; font-weight: 700; margin-bottom: 5px; }
        .label { color: #666; font-size: 0.9rem; }
        @media print { body { background: white; } .container { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${profile.name || 'SURA-RESTO by SURA'}</h1>
            <p>Revenue Analytics Report</p>
        </div>
        
        <div class="period-info">
            <h2>📊 Report Period: ${label}</h2>
            <p>Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">₹${analyticsData.totalRevenue.toLocaleString()}</div>
                <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${analyticsData.totalBills}</div>
                <div class="stat-label">Total Orders</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">₹${analyticsData.avgBillValue.toFixed(0)}</div>
                <div class="stat-label">Average Order Value</div>
            </div>
            ${['month', 'custom'].includes(dateFilter) ? `
            <div class="stat-card">
                <div class="stat-number">₹${analyticsData.avgDayRevenue.toFixed(0)}</div>
                <div class="stat-label">Average Day Revenue</div>
            </div>
            ` : ''}
            ${['year', 'customYear'].includes(dateFilter) ? `
            <div class="stat-card">
                <div class="stat-number">₹${analyticsData.avgMonthRevenue.toFixed(0)}</div>
                <div class="stat-label">Average Month Revenue</div>
            </div>
            ` : ''}
        </div>
        
        <div class="revenue-expense-grid">
            <div class="revenue-card">
                <div class="card-title">💰 Revenue Summary</div>
                <div class="amount">₹${analyticsData.totalRevenue.toLocaleString()}</div>
                <div class="label">Total Revenue</div>
            </div>
            <div class="expense-card">
                <div class="card-title">📉 Expense Summary</div>
                <div class="amount">₹${analyticsData.totalExpenses.toLocaleString()}</div>
                <div class="label">Total Expenses</div>
            </div>
        </div>
        
        <div class="profit-section">
            <div class="profit-title">💹 Profit Analysis</div>
            <div class="profit-value">${analyticsData.netProfit > 0 ? '+' : analyticsData.netProfit < 0 ? '-' : ''}₹${Math.abs(analyticsData.netProfit).toLocaleString()}</div>
            <div class="profit-margin">Profit Margin: ${analyticsData.profitMargin.toFixed(1)}%</div>
        </div>
        
        ${analyticsData.topSellingItems.length > 0 ? `
        <div class="section">
            <h3 class="section-title">🏆 Top Selling Items</h3>
            <div class="items-grid">
                ${analyticsData.topSellingItems.map((item, index) => `
                    <div class="item-card">
                        <div class="item-name">${index + 1}. ${item.name}</div>
                        <div class="item-details">Quantity: ${item.quantity} | Revenue: ₹${item.revenue.toLocaleString()}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="section">
            <h3 class="section-title">📋 Expense Breakdown</h3>
            <div class="items-grid">
                <div class="item-card">
                    <div class="item-name">Raw Material Expenses</div>
                    <div class="item-details">₹${(analyticsData.rawMaterialExpense || 0).toLocaleString()}</div>
                </div>
                <div class="item-card">
                    <div class="item-name">Upad Expenses</div>
                    <div class="item-details">₹${(analyticsData.upadAsExpense || 0).toLocaleString()}</div>
                </div>
                <div class="item-card">
                    <div class="item-name">Staff Salary Expenses</div>
                    <div class="item-details">₹${analyticsData.staffSalaryExpense.toLocaleString()}</div>
                </div>
                <div class="item-card">
                    <div class="item-name">Other Expenses</div>
                    <div class="item-details">₹0</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>${profile.name || 'SURA-RESTO by SURA'}</strong></p>
            <p>Restaurant Management System by SURA</p>
            <p class="generated-date">Report generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date().toLocaleTimeString()}</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    // Create blob and download as .html file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const formattedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\//g, '-');
    a.download = `revenue_analytics_${dateFilter}_${formattedDate}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSuccess('✅ Beautiful HTML report downloaded successfully!');
  };

  return (
    <>
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Responsive Sidebar Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? drawerOpen : true}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            bgcolor: '#6A1B9A',
            color: 'white',
            boxSizing: 'border-box',
            overflowX: 'hidden', // Remove horizontal scrolling
            overflowY: 'auto', // Keep vertical scrolling if needed
          },
        }}
      >
        {/* Sidebar content (profile, nav, etc) */}
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
          <span style={{ fontSize: 32, marginRight: 8 }}>🍽️</span>
          <Box>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
              {profile.name || 'SURA-RESTO by SURA'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {profile.address || 'Owner Dashboard'}
            </Typography>
          </Box>
        </Box>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<Restaurant />}
          sx={{
            color: 'white',
            borderColor: 'rgba(255,255,255,0.3)',
            mb: 1,
            mt: 2,
            '&:hover': {
              borderColor: 'white',
              bgcolor: 'rgba(255,255,255,0.1)',
            },
          }}
          onClick={() => setShowProfileDialog(true)}
        >
          Profile
        </Button>
        <List sx={{ pt: 2, px: 1 }}>
          {navigationItems.map((item) => (
            <ListItemButton
              key={item.id}
              selected={activeSection === item.id}
              onClick={() => setActiveSection(item.id)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                px: 2,
                py: 1.5,
                minHeight: 48,
                whiteSpace: 'nowrap', // Prevent text wrapping
                overflow: 'hidden', // Hide any overflow
                '&.Mui-selected': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.15)',
                  },
                },
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'white', minWidth: 36 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label} 
                sx={{ 
                  '& .MuiListItemText-primary': {
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }
                }}
              />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'rgba(255,255,255,0.7)', 
              mb: 1,
              fontSize: '0.75rem',
              wordBreak: 'break-all',
              lineHeight: 1.2,
              maxHeight: '2.4em',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
            title={currentUser?.email} // Show full email on hover
          >
            {currentUser?.email}
          </Typography>
          <Button
            fullWidth
            variant="outlined"
            onClick={logout}
            startIcon={<Logout />}
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.3)',
              fontSize: '0.875rem',
              py: 1,
              '&:hover': {
                borderColor: 'white',
                bgcolor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>

      {/* Mobile menu icon button */}
      {isMobile && (
        <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: '#6A1B9A', position: 'fixed', top: 16, left: 16, zIndex: 2000 }}>
          <MenuIcon />
        </IconButton>
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          p: { xs: 1, sm: 2, md: 3 },
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#f8f9fa',
        }}
      >


        {/* Content Area */}
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 },
            pt: { xs: 1.5, sm: 2 },
            width: '100%',
            boxSizing: 'border-box',
            bgcolor: '#f8f9fa',
          }}
        >
          {/* Alerts */}
        <Snackbar
          open={!!success}
          autoHideDuration={2500}
          onClose={() => setSuccess('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>
        <Snackbar
          open={!!error}
          autoHideDuration={3000}
          onClose={() => setError('')}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>

          {/* Revenue Dashboard Section */}
          {activeSection === 'dashboard' && (
            <Box>
              {/* Filter Controls */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>
                    💰 Revenue Analytics
                  </Typography>
                  
                  {/* Modern Filter Buttons */}
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 1, 
                    alignItems: 'center',
                    bgcolor: 'white',
                    p: 1,
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(106, 27, 154, 0.1)',
                    border: '1px solid rgba(106, 27, 154, 0.1)'
                  }}>
                    <Typography variant="body2" sx={{ 
                      color: '#6b7280', 
                      fontWeight: 500,
                      mr: 1,
                      fontSize: '0.875rem'
                    }}>
                      Time Period
                    </Typography>
                    
                    {/* Quick Filter Buttons */}
                    {[
                      { value: 'today', label: 'Today', icon: '📅' },
                      { value: 'yesterday', label: 'Yesterday', icon: '🕒' },
                      { value: 'week', label: 'Week', icon: '📊' },
                      { value: 'month', label: 'Month', icon: '📈' },
                      { value: 'year', label: 'Year', icon: '📋' }
                    ].map((filter) => (
                      <Button 
                        key={filter.value}
                        onClick={() => setDateFilter(filter.value as DateFilter)}
                        variant={dateFilter === filter.value ? 'contained' : 'text'}
                        size="small"
                        sx={{
                          minWidth: 'auto',
                          px: 2,
                          py: 1,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: dateFilter === filter.value ? 600 : 500,
                          fontSize: '0.875rem',
                          color: dateFilter === filter.value ? 'white' : '#6b7280',
                          bgcolor: dateFilter === filter.value ? '#6A1B9A' : 'transparent',
                          boxShadow: dateFilter === filter.value ? '0 2px 8px rgba(106, 27, 154, 0.3)' : 'none',
                          '&:hover': {
                            bgcolor: dateFilter === filter.value ? '#5a1a8a' : 'rgba(107, 114, 128, 0.08)',
                            boxShadow: dateFilter === filter.value ? '0 4px 12px rgba(106, 27, 154, 0.4)' : 'none'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Box component="span" sx={{ mr: 0.5 }}>{filter.icon}</Box>
                        {filter.label}
                      </Button>
                    ))}
                    
                    {/* Custom Date Button */}
                    <Button 
                      onClick={() => setShowCustomDatePicker(true)}
                      startIcon={<DateRange />}
                      size="small"
                      sx={{ 
                        minWidth: 'auto',
                        px: 2,
                        py: 1,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        color: '#6A1B9A',
                        bgcolor: 'rgba(106, 27, 154, 0.08)',
                        border: '1px solid rgba(106, 27, 154, 0.2)',
                        '&:hover': {
                          bgcolor: 'rgba(106, 27, 154, 0.12)',
                          borderColor: '#6A1B9A'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Custom
                    </Button>
                  </Box>
                  
                  {/* Refresh Button - Now positioned after and outside the Time Period section */}
                  <IconButton
                    onClick={handleRefresh}
                    disabled={refreshing}
                    size="small"
                    sx={{
                      color: '#6A1B9A',
                      ml: 1,
                      '&:hover': {
                        bgcolor: 'rgba(106, 27, 154, 0.08)'
                      },
                      '&:disabled': {
                        color: 'rgba(106, 27, 154, 0.5)'
                      }
                    }}
                  >
                    {refreshing ? (
                      <CircularProgress size={18} sx={{ color: '#6A1B9A' }} />
                    ) : (
                      <Refresh fontSize="small" />
                    )}
                  </IconButton>
                </Box>

                 {/* Date Range Display */}
                <Box sx={{ 
                  bgcolor: '#f8f9fa', 
                  p: 2, 
                  borderRadius: 1, 
                  borderLeft: '4px solid #6A1B9A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DateRange sx={{ color: '#6A1B9A' }} />
                    <Typography variant="body2" sx={{ color: '#6A1B9A', fontWeight: 'medium' }}>
                      {getDateRange(dateFilter).label}
                    </Typography>
                  </Box>
                  
                  {/* PDF Download Button - Now positioned at the end of date range section */}
                                      <Tooltip title="Download Beautiful HTML Report">
                    <IconButton
                      onClick={handleDownloadRevenueText}
                      size="small"
                      sx={{
                        color: '#6A1B9A',
                        '&:hover': {
                          bgcolor: 'rgba(106, 27, 154, 0.08)'
                        }
                      }}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Analytics Cards */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(auto-fit, minmax(280px, 1fr))' }, 
                gap: 3, 
                mb: 3
              }}>
                {[
                  {
                    icon: '💰',
                    title: 'Total Revenue',
                    value: `₹${analyticsData.totalRevenue.toLocaleString()}`,
                    subtitle: `${analyticsData.totalBills} orders${dateFilter === 'today' ? ' • Resets daily' : ''}`,
                    color: '#6A1B9A',
                    bgGradient: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
                    trend: analyticsData.totalRevenue > 0 ? '+' : '',
                    iconBg: '#8E24AA'
                  },
                  {
                    icon: '📉',
                    title: 'Total Expenses',
                    value: `₹${analyticsData.totalExpenses.toLocaleString()}`,
                    subtitle: `Raw Material: ₹${(analyticsData.rawMaterialExpense || 0).toLocaleString()} • Upad: ₹${(analyticsData.upadAsExpense || 0).toLocaleString()}`,
                    color: '#FF6B6B',
                    bgGradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8A8A 100%)',
                    trend: analyticsData.totalExpenses > 0 ? '-' : '',
                    iconBg: '#FF8A8A'
                  },
                  ['month', 'year', 'custom', 'customYear'].includes(dateFilter) ? {
                    icon: '👨‍🍳',
                    title: 'Staff Paid Salary',
                    value: `-₹${analyticsData.staffSalaryExpense.toLocaleString()}`,
                    subtitle: ['month', 'custom'].includes(dateFilter) ? 'For the selected month' : 'For the selected year',
                    color: '#4CAF50',
                    bgGradient: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                    trend: '',
                    iconBg: '#45a049'
                  } : null,
                  {
                    icon: '📊',
                    title: 'Avg Order Value',
                    value: `₹${analyticsData.avgBillValue.toFixed(0)}`,
                    subtitle: 'Per customer transaction',
                    color: '#FFA726',
                    bgGradient: 'linear-gradient(135deg, #FFA726 0%, #FFB74D 100%)',
                    trend: analyticsData.avgBillValue > 0 ? '+' : '',
                    iconBg: '#FFB74D'
                  },
                  ...( ["month", "custom"].includes(dateFilter) ? [
                    {
                      icon: '🗓️',
                      title: 'Avg Day Revenue',
                      value: `₹${analyticsData.avgDayRevenue.toFixed(0)}`,
                      subtitle: analyticsData.avgDayRevenueSubtitle,
                      color: '#1976D2',
                      bgGradient: 'linear-gradient(135deg, #1976D2 0%, #64B5F6 100%)',
                      trend: analyticsData.avgDayRevenue > 0 ? '+' : '',
                      iconBg: '#64B5F6'
                    }
                  ] : []),
                  ...( ["year", "customYear"].includes(dateFilter) ? [
                    {
                      icon: '📅',
                      title: 'Avg Month Revenue',
                      value: `₹${analyticsData.avgMonthRevenue.toFixed(0)}`,
                      subtitle: analyticsData.avgMonthRevenueSubtitle,
                      color: '#9C27B0',
                      bgGradient: 'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)',
                      trend: analyticsData.avgMonthRevenue > 0 ? '+' : '',
                      iconBg: '#BA68C8'
                    }
                  ] : []),
                  {
                    icon: '💹',
                    title: 'Net Profit',
                    value: `${analyticsData.netProfit > 0 ? '+' : analyticsData.netProfit < 0 ? '-' : ''}₹${Math.abs(analyticsData.netProfit).toLocaleString()}`,
                    subtitle: `${analyticsData.profitMargin.toFixed(1)}% margin`,
                    color: analyticsData.netProfit >= 0 ? '#4ECDC4' : '#FF6B6B',
                    bgGradient: analyticsData.netProfit >= 0 
                      ? 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)'
                      : 'linear-gradient(135deg, #FF6B6B 0%, #FF8A8A 100%)',
                    trend: '',
                    iconBg: analyticsData.netProfit >= 0 ? '#44A08D' : '#FF8A8A',
                    big: true
                  }
                ]
                  .filter((card): card is NonNullable<typeof card> => card !== null)
                  .map((card, index) => (
                    <Card 
                      key={index}
                      sx={{ 
                        position: 'relative',
                        overflow: 'hidden',
                        background: card.bgGradient,
                        color: 'white',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: `0 15px 35px ${card.color}40`
                        }
                      }}
                    >
                      {/* Background Pattern */}
                      <Box sx={{ 
                        position: 'absolute',
                        top: -20,
                        right: -20,
                        width: 100,
                        height: 100,
                        bgcolor: card.iconBg,
                        opacity: 0.2,
                        borderRadius: '50%'
                      }} />
                      <Box sx={{ 
                        position: 'absolute',
                        bottom: -30,
                        right: -30,
                        width: 120,
                        height: 120,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        borderRadius: '50%'
                      }} />
                      
                      <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 'medium', opacity: 0.9 }}>
                            {card.title}
                  </Typography>
                          <Box sx={{ 
                            fontSize: '2.5rem',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                          }}>
                            {card.icon}
                          </Box>
                        </Box>
                        
                        <Typography 
                          sx={{ 
                            fontWeight: 'bold', 
                            mb: 1,
                            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            fontSize: (() => {
                              const valueLength = card.value.length;
                              if (valueLength <= 8) return '2.5rem'; // ₹1,000
                              if (valueLength <= 12) return '2rem'; // ₹1,000,000
                              if (valueLength <= 16) return '1.5rem'; // ₹1,000,000,000
                              if (valueLength <= 20) return '1.25rem'; // ₹1,000,000,000,000
                              return '1rem'; // Very large numbers
                            })(),
                            lineHeight: 1.2,
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word'
                          }}
                        >
                          {card.trend && (
                            <Typography component="span" sx={{ 
                              fontSize: (() => {
                                const valueLength = card.value.length;
                                if (valueLength <= 8) return '0.7em';
                                if (valueLength <= 12) return '0.6em';
                                if (valueLength <= 16) return '0.5em';
                                if (valueLength <= 20) return '0.4em';
                                return '0.3em';
                              })(),
                              opacity: 0.8 
                            }}>
                              {card.trend}
                            </Typography>
                          )}
                          {card.value}
                        </Typography>
                        
                        <Typography variant="body2" sx={{ 
                          opacity: 0.9,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}>
                          {card.subtitle}
                  </Typography>
                        </CardContent>
                      </Card>
                  ))}
          </Box>

              {/* Charts and Top Selling Items */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 4,
                  maxWidth: '100%',
                  width: '100%',
                  ml: 0,
                  pl: 0,
                }}
              >
                {/* Revenue Trend Chart */}
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    position: 'relative',
                    width: '100%',
                    maxWidth: '100%',
                    ml: 0,
                    pl: 0,
                  }}
                >
                  <Box sx={{ 
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    fontSize: '8rem',
                    opacity: 0.05,
                    transform: 'rotate(15deg)'
                  }}>
                    📈
                  </Box>
                  <Typography variant="h6" gutterBottom sx={{ 
                    color: '#6A1B9A', 
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    position: 'relative',
                    zIndex: 1
                  }}>
                    📊 Revenue & Expense Analysis
                  </Typography>
                  <Box sx={{ height: '350px', width: '100%', position: 'relative', zIndex: 1 }}>
                    {getDayWiseData().length === 0 ? (
                      <Box sx={{ textAlign: 'center', color: '#888', py: 8 }}>
                        <Typography variant="h6">No data for selected period</Typography>
                        <Typography variant="body2">Try changing the date filter or add some bills/expenses.</Typography>
                      </Box>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={getDayWiseData()}
                          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis tickFormatter={v => v.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
                          <RechartsTooltip
                            formatter={(value, name) => [
                              typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value,
                              name === 'revenue' || name === 'Revenue' ? 'Revenue' : 'Expenses'
                            ]}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="revenue" stroke="#4CAF50" name="Revenue" />
                          <Line type="monotone" dataKey="expenses" stroke="#FF6B6B" name="Expenses" />
                          <Bar dataKey="revenue" fill="#4CAF50" opacity={0.2} name="Revenue (Bar)" />
                          <Bar dataKey="expenses" fill="#FF6B6B" opacity={0.2} name="Expenses (Bar)" />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </Box>
                  
                </Paper>

                {/* Top Selling Items */}
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    position: 'relative',
                    width: '100%',
                    maxWidth: '100%',
                  }}
                >
                
                  <Box sx={{ 
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    fontSize: '8rem',
                    opacity: 0.05,
                    transform: 'rotate(-15deg)'
                  }}>
                    🏆
                  </Box>
                  <Typography variant="h6" gutterBottom sx={{ 
                    color: '#6A1B9A', 
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    position: 'relative',
                    zIndex: 1
                  }}>
                    🏆 Top Selling Items
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 2, 
                    mt: 2, 
                    height: '350px',
                    overflowY: 'auto',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    {analyticsData.topSellingItems.length === 0 ? (
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        justifyContent: 'center',
                        height: '100%',
                        color: '#666' 
                      }}>
                        <Typography sx={{ fontSize: '3rem', mb: 2 }}>🍽️</Typography>
                        <Typography variant="h6" gutterBottom>
                          No Sales Data Yet
                        </Typography>
                        <Typography variant="body2" color="textSecondary" textAlign="center">
                          Top selling items will appear here<br/>
                          once bills are generated
                        </Typography>
                      </Box>
                    ) : (
                      analyticsData.topSellingItems.map((item, index) => {
                        const rankIcons = ['🥇', '🥈', '🥉', '🏅', '🏅'];
                        const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#6A1B9A', '#FF9800'];
                        
                        return (
                          <Box key={item.id} sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            p: 2.5,
                            background: index === 0 
                              ? 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)'
                              : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            color: index === 0 ? 'white' : 'inherit',
                            borderRadius: 2,
                            border: index === 0 ? 'none' : '2px solid #e9ecef',
                            boxShadow: index === 0 
                              ? '0 8px 25px rgba(106, 27, 154, 0.3)'
                              : '0 2px 8px rgba(0,0,0,0.05)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: index === 0 
                                ? '0 12px 35px rgba(106, 27, 154, 0.4)'
                                : '0 8px 25px rgba(0,0,0,0.1)'
                            }
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Typography sx={{ fontSize: '1.5rem' }}>
                                {rankIcons[index] || '🏅'}
                              </Typography>
                              <Box>
                                <Typography variant="body1" sx={{ 
                                  fontWeight: 'bold',
                                  color: index === 0 ? 'white' : '#2c3e50'
                                }}>
                                  {item.name}
                                </Typography>
                                <Typography variant="body2" sx={{ 
                                  opacity: 0.8,
                                  color: index === 0 ? 'rgba(255,255,255,0.9)' : '#6c757d'
                                }}>
                                  💰 ₹{item.revenue.toLocaleString()} revenue
                                </Typography>
                              </Box>
                            </Box>
                            <Chip 
                              label={`${item.quantity} sold`}
                              size="small"
                              sx={{ 
                                bgcolor: index === 0 
                                  ? 'rgba(255,255,255,0.2)' 
                                  : `${rankColors[index]}20`,
                                color: index === 0 
                                  ? 'white' 
                                  : rankColors[index],
                                fontWeight: 'bold',
                                border: index === 0 
                                  ? '1px solid rgba(255,255,255,0.3)'
                                  : `1px solid ${rankColors[index]}40`
                              }}
                            />
                          </Box>
                        );
                      })
                    )}
          </Box>
          </Paper>
          

              </Box>

              {/* Monthly Revenue vs Expense Bar Chart - Restyled */}
              <div className="bg-white rounded-2xl p-6 shadow-md mt-8">
                {/* Section Heading */}
                <h2 className="text-lg font-semibold text-[#212121] mb-4 flex items-center gap-2">
                  📊 Monthly Revenue vs Expenses ({new Date().getFullYear()})
                </h2>
                
                {/* Chart Legend */}
                <div className="flex items-center gap-6 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-gray-600">Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded"></div>
                    <span className="text-gray-600">Expenses</span>
                  </div>
                </div>

                {/* Chart Container with Scroll Support */}
                <div className="h-96 w-full overflow-x-auto overflow-y-visible">
                  {getMonthlyData().every(month => month.revenue === 0 && month.expenses === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <h3 className="text-lg font-medium mb-2">No data for current year</h3>
                      <p className="text-sm text-center">Monthly revenue and expense data will appear here as you add bills and expenses.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getMonthlyData()}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={v => `₹${v.toLocaleString()}`} />
                        <RechartsTooltip
                          formatter={(value, name) => [
                            `₹${(typeof value === 'number' ? value : 0).toLocaleString()}`,
                            name === 'revenue' ? 'Revenue' : name === 'expenses' ? 'Expenses' : name
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="revenue" fill="#4CAF50" name="Revenue" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" fill="#FF6B6B" name="Expenses" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </Box>
          )}

          {/* Menu Management Section */}
          {activeSection === 'menu' && (
            <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>
                    🍽️ Menu Management
                  </Typography>
                    <IconButton
                      onClick={handleRefresh}
                      disabled={refreshing}
                      size="small"
                      sx={{
                        color: '#6A1B9A',
                        '&:hover': {
                          bgcolor: 'rgba(106, 27, 154, 0.08)'
                        },
                        '&:disabled': {
                          color: 'rgba(106, 27, 154, 0.5)'
                        }
                      }}
                    >
                      {refreshing ? (
                        <CircularProgress size={18} sx={{ color: '#6A1B9A' }} />
                      ) : (
                        <Refresh fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    Manage your restaurant menu items, prices, and availability
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleMenuDialogOpen()}
                  sx={{ 
                    background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
                    '&:hover': { 
                      background: 'linear-gradient(135deg, #4A148C 0%, #6A1B9A 100%)'
                    },
                    px: 3,
                    py: 1.5,
                    borderRadius: 2,
                    boxShadow: '0 6px 20px rgba(106, 27, 154, 0.3)',
                    textTransform: 'none',
                    fontSize: '1rem'
                  }}
                >
                Add New Item
              </Button>
            </Box>

              {/* Quick Stats & Search */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 3, mb: 3 }}>
                {/* Quick Stats */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: 2
                }}>
                  <Card sx={{ 
                    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      fontSize: '3rem',
                      opacity: 0.3
                    }}>
                      📋
          </Box>
                    <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {menuItems.length}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Total Menu Items
                      </Typography>
                    </CardContent>
                  </Card>
                  
                  {/* Smaller Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<UploadFileIcon />}
                      onClick={() => setCsvDialogOpen(true)}
                      size="small"
                      sx={{
                        borderColor: '#6A1B9A',
                        color: '#6A1B9A',
                        fontWeight: 500,
                        px: 2,
                        py: 0.75,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '0.875rem',
                        '&:hover': {
                          borderColor: '#4A148C',
                          bgcolor: 'rgba(106, 27, 154, 0.04)'
                        }
                      }}
                    >
                      Import CSV
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<MenuBook />}
                      onClick={() => setCategoryDialogOpen(true)}
                      size="small"
                      sx={{
                        borderColor: '#FF9800',
                        color: '#FF9800',
                        fontWeight: 500,
                        px: 2,
                        py: 0.75,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '0.875rem',
                        '&:hover': {
                          borderColor: '#F57C00',
                          bgcolor: 'rgba(255, 152, 0, 0.04)'
                        }
                      }}
                    >
                      Categories
                    </Button>
                  </Box>
                </Box>

                {/* Enhanced Search */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    label="🔍 Search Menu Items"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                    fullWidth
                    variant="outlined"
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
                  }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: '#6A1B9A',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#6A1B9A',
                        },
                      },
                    }}
                  />
                  
                  {/* Professional Category Filter */}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 3,
                    p: 3,
                    bgcolor: 'white',
                    borderRadius: 3,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(0,0,0,0.06)'
                  }}>
                    {/* Filter Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" sx={{ 
                        color: '#1a1a1a', 
                        fontWeight: 600,
                        fontSize: '1.1rem'
                      }}>
                        Filter by Category
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#6b7280',
                        fontSize: '0.875rem'
                      }}>
                        {filteredMenuItems.length} of {menuItems.length} items
                      </Typography>
                    </Box>

                    {/* Category Tabs */}
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 1, 
                      flexWrap: 'wrap',
                      alignItems: 'center'
                    }}>
                      {/* All Tab */}
                      <Button
                        onClick={() => {
                          setSelectedCategory('All');
                          setSearchTerm('');
                        }}
                        variant={selectedCategory === 'All' ? 'contained' : 'text'}
                        sx={{
                          minWidth: 'auto',
                          px: 2.5,
                          py: 1,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: selectedCategory === 'All' ? 600 : 500,
                          fontSize: '0.875rem',
                          color: selectedCategory === 'All' ? 'white' : '#6b7280',
                          bgcolor: selectedCategory === 'All' ? '#6A1B9A' : 'transparent',
                          boxShadow: selectedCategory === 'All' ? '0 2px 8px rgba(106, 27, 154, 0.3)' : 'none',
                          '&:hover': {
                            bgcolor: selectedCategory === 'All' ? '#5a1a8a' : 'rgba(107, 114, 128, 0.08)',
                            boxShadow: selectedCategory === 'All' ? '0 4px 12px rgba(106, 27, 154, 0.4)' : 'none'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        All
                      </Button>

                      {/* Category Tabs */}
                      {categories.slice(0, 6).map((category) => {
                        const itemCount = menuItems.filter(item => item.category === category).length;
                        return (
                          <Button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                            setSearchTerm('');
                        }}
                            variant={selectedCategory === category ? 'contained' : 'text'}
                        sx={{
                              minWidth: 'auto',
                              px: 2.5,
                              py: 1,
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: selectedCategory === category ? 600 : 500,
                              fontSize: '0.875rem',
                              color: selectedCategory === category ? 'white' : '#6b7280',
                          bgcolor: selectedCategory === category ? '#6A1B9A' : 'transparent',
                              boxShadow: selectedCategory === category ? '0 2px 8px rgba(106, 27, 154, 0.3)' : 'none',
                          '&:hover': {
                                bgcolor: selectedCategory === category ? '#5a1a8a' : 'rgba(107, 114, 128, 0.08)',
                                boxShadow: selectedCategory === category ? '0 4px 12px rgba(106, 27, 154, 0.4)' : 'none'
                              },
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {category}
                            <Box
                              component="span"
                              sx={{
                                ml: 1,
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                bgcolor: selectedCategory === category ? 'rgba(255,255,255,0.2)' : 'rgba(107, 114, 128, 0.1)',
                                color: selectedCategory === category ? 'white' : '#6b7280'
                              }}
                            >
                              {itemCount}
                            </Box>
                          </Button>
                        );
                      })}

                      {/* More Categories Dropdown */}
                      {categories.length > 6 && (
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                          <Select
                            value={categories.slice(6).includes(selectedCategory) ? selectedCategory : ''}
                            onChange={(e) => {
                              setSelectedCategory(e.target.value);
                              setSearchTerm('');
                            }}
                            displayEmpty
                            renderValue={(selected) => selected || 'More Categories'}
                            sx={{
                              borderRadius: 2,
                              bgcolor: 'rgba(107, 114, 128, 0.05)',
                              border: 'none',
                              '& .MuiOutlinedInput-notchedOutline': {
                                border: '1px solid rgba(107, 114, 128, 0.2)'
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                border: '1px solid #6A1B9A'
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                border: '2px solid #6A1B9A'
                              },
                              '& .MuiSelect-select': {
                                py: 1,
                                fontSize: '0.875rem',
                                color: '#6b7280'
                          }
                        }}
                          >
                            {categories.slice(6).map((category) => {
                              const itemCount = menuItems.filter(item => item.category === category).length;
                              return (
                                <MenuItem key={category} value={category}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    <span>{category}</span>
                                    <Box
                                      component="span"
                                      sx={{
                                        ml: 1,
                                        px: 1,
                                        py: 0.25,
                                        borderRadius: 1,
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        bgcolor: 'rgba(107, 114, 128, 0.1)',
                                        color: '#6b7280'
                                      }}
                                    >
                                      {itemCount}
                                    </Box>
                                  </Box>
                                </MenuItem>
                              );
                            })}
                          </Select>
                        </FormControl>
                      )}
                    </Box>
              </Box>
              </Box>
              </Box>

              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table stickyHeader>
              <TableHead>
                <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Item No</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Private Price</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Loading Price</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>AC Hall Price</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                    {paginatedMenuItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>#{item.itemNo}</TableCell>
                      <TableCell>
                            <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>{item.name}</Typography>
                            {item.description && (
                              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</Typography>
                        )}
                            </Box>
                      </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>₹{item.privatePrice}</TableCell>
                        <TableCell>₹{item.loadingPrice}</TableCell>
                        <TableCell>
                          {(item as any).acHallPrice && (item as any).acHallPrice > 0 ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <span>₹{(item as any).acHallPrice}</span>
                              <Chip label="AC" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565C0', fontSize: '0.7rem', height: 18 }} />
                            </Box>
                          ) : (
                            <Typography variant="body2" color="textSecondary">-</Typography>
                          )}
                        </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <IconButton onClick={() => handleMenuDialogOpen(item)} size="small" sx={{ color: '#6A1B9A' }}>
                                <Edit fontSize="small" />
                        </IconButton>
                            <IconButton onClick={() => handleDeleteMenuItem(item.id)} size="small" sx={{ color: '#F44336' }}>
                                <Delete fontSize="small" />
                        </IconButton>
                            </Box>
                      </TableCell>
                    </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1 }}>
                <IconButton onClick={() => setMenuPage((prev) => Math.max(prev - 1, 0))} disabled={menuPage === 0}>
                  <span style={{ fontSize: 28 }}>⬅️</span>
                </IconButton>
                <Typography sx={{ mx: 2, fontWeight: 'bold', color: '#6A1B9A' }}>
                  Page {menuPage + 1} of {maxMenuPage + 1}
                </Typography>
                <IconButton onClick={() => setMenuPage((prev) => Math.min(prev + 1, maxMenuPage))} disabled={menuPage >= maxMenuPage}>
                  <span style={{ fontSize: 28 }}>➡️</span>
                </IconButton>
              </Box>
            </Box>
          )}

          {/* Raw Material Expenses Section */}
          {activeSection === 'expenses' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>
                      🛒 Raw Material Expenses
                  </Typography>
                    <IconButton
                      onClick={handleRefresh}
                      disabled={refreshing}
                      size="small"
                      sx={{
                        color: '#6A1B9A',
                        '&:hover': {
                          bgcolor: 'rgba(106, 27, 154, 0.08)'
                        },
                        '&:disabled': {
                          color: 'rgba(106, 27, 154, 0.5)'
                        }
                      }}
                    >
                      {refreshing ? (
                        <CircularProgress size={18} sx={{ color: '#6A1B9A' }} />
                      ) : (
                        <Refresh fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    Track kitchen expenses and raw material costs • Filter synced with Revenue Dashboard • {getDateRange(dateFilter).label}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setIsExpenseDialogOpen(true)}
                  sx={{ 
                    bgcolor: '#6A1B9A',
                    '&:hover': { bgcolor: '#4A148C' },
                    px: 3,
                    py: 1.5,
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(106, 27, 154, 0.3)'
                  }}
                >
                  Add New Expense
                </Button>
              </Box>

              {/* Expense Summary Cards */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                gap: 3, 
                mb: 3 
              }}>
                {[{ name: 'Vegetables', icon: '🥬', color: '#4CAF50' }, { name: 'Dairy', icon: '🥛', color: '#FF9800' }, { name: 'Meat', icon: '🥩', color: '#F44336' }, { name: 'Spices', icon: '🌶️', color: '#9C27B0' }, { name: 'Other', icon: '📦', color: '#607D8B' }].map((category) => {
                  const categoryExpenses = filteredExpensesForDisplay.filter((exp: Expense) => exp.category === category.name);
                  const total = categoryExpenses.reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
                  return (
                    <Card key={category.name} sx={{ background: `linear-gradient(135deg, ${category.color}20 0%, #fff 100%)`, color: category.color }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Typography sx={{ fontSize: '2rem', mr: 1.5 }}>{category.icon}</Typography>
                          <Typography variant="h6" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>{category.name}</Typography>
                        </Box>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: category.color, mb: 1 }}>
                          ₹{total.toLocaleString()}
                        </Typography>
              <Typography variant="body2" color="textSecondary">
                          {categoryExpenses.length} entries in period
              </Typography>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>

              {/* Quick Stats */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>
                    ₹{filteredExpensesForDisplay.reduce((sum: number, exp: Expense) => sum + exp.amount, 0).toLocaleString()}
              </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Expenses - {getDateRange(dateFilter).label}
              </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: '#4CAF50', fontWeight: 'bold' }}>
                    {filteredExpensesForDisplay.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Entries in Period
                  </Typography>
                </Box>
              </Box>

              <TableContainer component={Paper}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: '#6A1B9A', color: 'white' }}>Date</TableCell>
                      <TableCell sx={{ bgcolor: '#6A1B9A', color: 'white' }}>Category</TableCell>
                      <TableCell sx={{ bgcolor: '#6A1B9A', color: 'white' }}>Description</TableCell>
                      <TableCell align="right" sx={{ bgcolor: '#6A1B9A', color: 'white' }}>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredExpensesForDisplay
                      .sort((a: Expense, b: Expense) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((expense: Expense) => (
                        <TableRow key={expense.id} hover>
                          <TableCell>{new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                          <TableCell>
                            <Chip label={expense.category} size="small" />
                          </TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'medium', color: '#FF6B6B' }}>
                            ₹{expense.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Bill History Section */}
          {activeSection === 'bills' && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>
                      📄 Bill History
                  </Typography>
                    <IconButton
                      onClick={handleRefresh}
                      disabled={refreshing}
                      size="small"
                      sx={{
                        color: '#6A1B9A',
                        '&:hover': {
                          bgcolor: 'rgba(106, 27, 154, 0.08)'
                        },
                        '&:disabled': {
                          color: 'rgba(106, 27, 154, 0.5)'
                        }
                      }}
                    >
                      {refreshing ? (
                        <CircularProgress size={18} sx={{ color: '#6A1B9A' }} />
                      ) : (
                        <Refresh fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                </Box>
                
                                 {/* Current Filter Info */}
                 <Box sx={{ 
                   bgcolor: '#fff3e0', 
                   p: 2, 
                   borderRadius: 1, 
                   borderLeft: '4px solid #ff9800',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'space-between'
                 }}>
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                     <DateRange sx={{ color: '#ff9800' }} />
                     <Typography variant="body2" sx={{ color: '#e65100', fontWeight: 'medium' }}>
                       {getDateRange(dateFilter).label}
                     </Typography>
                     <Typography variant="body2" sx={{ color: '#666', ml: 1 }}>
                       • Filter synced with Revenue Dashboard
                     </Typography>
                   </Box>
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                     <Typography variant="body2" sx={{ color: '#e65100', fontWeight: 'bold' }}>
                       {filteredBills.length} bills in period
                     </Typography>
                   </Box>
                 </Box>
              </Box>

              <TableContainer 
                component={Paper} 
                sx={{ 
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}
              >
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      {[
                        { label: '🆔 Bill ID', align: 'left' },
                        { label: '📅 Date & Time', align: 'left' },
                        { label: '🪑 Table', align: 'center' },
                        { label: '👤 Customer Type', align: 'center' },
                        { label: '🛒 Items', align: 'center' },
                        { label: '💰 Total Amount', align: 'right' },
                        { label: '👁️ Actions', align: 'center' }
                      ].map((header, index) => (
                        <TableCell 
                          key={index}
                          align={header.align as any}
                          sx={{ 
                            background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            py: 2,
                            borderBottom: 'none'
                          }}
                        >
                          {header.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredBills.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 8 }}>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center',
                            color: 'text.secondary'
                          }}>
                            <Typography sx={{ fontSize: '4rem', mb: 2 }}>📄</Typography>
              <Typography variant="h6" gutterBottom>
                              No bills for selected period
              </Typography>
                            <Typography variant="body2">
                              Bills will appear here for the selected time period
              </Typography>
              </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedBills.map((bill, index) => {
                        const billDate = typeof bill.createdAt === 'object' && 'toDate' in bill.createdAt 
                          ? (bill.createdAt as any).toDate() 
                          : new Date(bill.createdAt);
                        
                        return (
                          <TableRow 
                            key={bill.id} 
                            sx={{ 
                              '&:hover': { 
                                bgcolor: '#fff3e0',
                                transform: 'scale(1.01)',
                                transition: 'all 0.2s ease'
                              },
                              '&:nth-of-type(odd)': {
                                bgcolor: '#fafafa'
                              }
                            }}
                          >
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography sx={{ fontSize: '1.2rem' }}>🧾</Typography>
                                <Typography variant="body2" sx={{ 
                                  fontFamily: 'monospace',
                                  fontWeight: 'bold',
                                  color: '#ff9800'
                                }}>
                                  #{bill.id.substring(0, 8)}
                                </Typography>
              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {billDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {billDate.toLocaleTimeString()}
                                </Typography>
              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={bill.customer?.tableNumber || 'N/A'}
                                size="small"
                                sx={{
                                  bgcolor: '#2196F320',
                                  color: '#2196F3',
                                  fontWeight: 'bold'
                                }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={`${bill.customerType === 'private' ? '👥' : '🚛'} ${bill.customerType === 'private' ? 'Private' : 'Loading'}`}
                                size="small"
                                sx={{
                                  bgcolor: bill.customerType === 'private' ? '#6A1B9A20' : '#FF980020',
                                  color: bill.customerType === 'private' ? '#6A1B9A' : '#FF9800',
                                  fontWeight: 'medium'
                                }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                <Typography sx={{ fontSize: '1rem' }}>🍽️</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {bill.items.length}
                                </Typography>
          </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="h6" sx={{ 
                                fontWeight: 'bold', 
                                color: '#4CAF50',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: 0.5
                              }}>
                                💰 ₹{bill.totalAmount.toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <IconButton 
                                onClick={() => {
                                  alert(`📋 Bill Details:\n\n🪑 Table: ${bill.customer?.tableNumber || 'N/A'}\n💰 Total: ₹${bill.totalAmount}\n🍽️ Items: ${bill.items.length}\n📅 Date: ${billDate.toLocaleString()}`);
                                }}
                                sx={{ 
                                  bgcolor: '#2196F310',
                                  color: '#2196F3',
                                  '&:hover': {
                                    bgcolor: '#2196F320',
                                    transform: 'scale(1.1)'
                                  }
                                }}
                                size="small"
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Pagination Controls */}
              {filteredBills.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
                  <IconButton onClick={() => setBillPage(prev => Math.max(prev - 1, 0))} disabled={billPage === 0}>
                    <span style={{ fontSize: 28 }}>⬅️</span>
                  </IconButton>
                  <Typography sx={{ mx: 2, fontWeight: 'bold', color: '#6A1B9A' }}>
                    Page {billPage + 1} of {maxBillPage + 1}
                  </Typography>
                  <IconButton onClick={() => setBillPage(prev => Math.min(prev + 1, maxBillPage))} disabled={billPage >= maxBillPage}>
                    <span style={{ fontSize: 28 }}>➡️</span>
                  </IconButton>
                </Box>
              )}
            </Box>
          )}

          {/* Staff Salary Section */}
          {activeSection === 'staff' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>
                    👨‍🍳 Staff Salary Management
                  </Typography>
                    <IconButton
                      onClick={handleRefresh}
                      disabled={refreshing}
                      size="small"
                      sx={{
                        color: '#6A1B9A',
                        '&:hover': {
                          bgcolor: 'rgba(106, 27, 154, 0.08)'
                        },
                        '&:disabled': {
                          color: 'rgba(106, 27, 154, 0.5)'
                        }
                      }}
                    >
                      {refreshing ? (
                        <CircularProgress size={18} sx={{ color: '#6A1B9A' }} />
                      ) : (
                        <Refresh fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    Add staff, set monthly salary, and track payment status
                  </Typography>
        </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setShowStaffDialog(true)}
                    sx={{
                      background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
                      '&:hover': { background: 'linear-gradient(135deg, #4A148C 0%, #6A1B9A 100%)' },
                      px: 3,
                      py: 1.5,
                      borderRadius: 2,
                      boxShadow: '0 6px 20px rgba(106, 27, 154, 0.3)',
                      textTransform: 'none',
                      fontSize: '1rem'
                    }}
                  >
                    Add Staff
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Assessment />}
                    onClick={() => {
                      setShowHistoryDialog(true);
                      setHistoryStaffIndex(null); // null means show all staff summary
                      setSummaryMonth(null);
                      setSummaryYear(null);
                    }}
                    sx={{
                      borderColor: '#6A1B9A',
                      color: '#6A1B9A',
                      fontWeight: 'bold',
                      px: 3,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '1rem'
                    }}
                  >
                    Staff History
                  </Button>
                </Box>
              </Box>
              <Card sx={{ p: 3, borderRadius: 3, boxShadow: 4, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#6A1B9A' }}>Staff List</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Monthly Salary</TableCell>
                        <TableCell>Join Date</TableCell>
                        <TableCell>Last Paid</TableCell>
                        <TableCell>Pending Months</TableCell>
                        <TableCell>Upad</TableCell>
                        <TableCell>Leave</TableCell>
                        <TableCell>Amount Left</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {staffList.slice(staffPage * STAFFS_PER_PAGE, (staffPage + 1) * STAFFS_PER_PAGE).map((staff, idx) => {
                        const globalIdx = staffPage * STAFFS_PER_PAGE + idx;
                        return (
                          <TableRow key={globalIdx} sx={{ '&:nth-of-type(odd)': { bgcolor: '#fafafa' } }}>
                            <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>{staff.name}</TableCell>
                            <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>₹{staff.salary}</TableCell>
                            <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>{staff.joinDate}</TableCell>
                            <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>{staff.lastPaidDate || '-'}</TableCell>
                            <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>{staff.pendingMonths}</TableCell>
                            <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>₹{(staff.prepaid || []).find(p => p.month === new Date().getMonth() && p.year === new Date().getFullYear())?.amount || 0}</TableCell>
                            <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>
                              <TextField
                                type="number"
                                value={staff.leave}
                                onChange={e => {
                                  const leave = Math.max(0, parseInt(e.target.value) || 0);
                                  setStaffList(list => list.map((s, i) => i === globalIdx ? { ...s, leave } : s));
                                }}
                                inputProps={{ min: 0, style: { width: 60, fontSize: '0.95rem', padding: 2 } }}
                                size="small"
                              />
                            </TableCell>
                            <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>₹{getAmountLeftToPay(staff)}</TableCell>
                            <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>
                              <Chip
                                label={getAmountLeftToPay(staff) === 0 ? 'Paid' : 'Unpaid'}
                                color={getAmountLeftToPay(staff) === 0 ? 'success' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center" sx={{ py: 0.5 }}>
                              <Button
                                variant="contained"
                                size="small"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setActionAnchorEl(e.currentTarget);
                                  setActionMenuIdx(globalIdx);
                                }}
                                sx={{ textTransform: 'none', fontWeight: 'bold', bgcolor: '#6A1B9A', color: 'white', '&:hover': { bgcolor: '#4A148C' }, fontSize: '0.95rem', py: 0.5, px: 1.5 }}
                              >
                                Action
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                {/* Staff Action Menu */}
                <Menu
                  anchorEl={actionAnchorEl}
                  open={Boolean(actionAnchorEl)}
                  onClose={() => setActionAnchorEl(null)}
                >
                  <MenuItem onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    if (actionMenuIdx !== null && handleMarkPaid) { 
                      handleMarkPaid(actionMenuIdx); 
                    } 
                    setActionAnchorEl(null); 
                  }}>Mark Paid</MenuItem>
                  <MenuItem onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    if (actionMenuIdx !== null && setHistoryStaffIndex && setShowHistoryDialog) { 
                      setHistoryStaffIndex(actionMenuIdx); 
                      setShowHistoryDialog(true); 
                    } 
                    setActionAnchorEl(null); 
                  }}>View History</MenuItem>
                  <MenuItem onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    if (actionMenuIdx !== null && handleUpad) { 
                      handleUpad(actionMenuIdx); 
                    } 
                    setActionAnchorEl(null); 
                  }}>Add Upad</MenuItem>
                  <MenuItem onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    if (actionMenuIdx !== null && handleRemoveStaff) { 
                      handleRemoveStaff(actionMenuIdx); 
                    } 
                    setActionAnchorEl(null); 
                  }}>Remove Staff</MenuItem>
                </Menu>

                {/* Pagination Controls */}
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
                  <IconButton onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    if (setStaffPage) {
                      setStaffPage(p => Math.max(p - 1, 0));
                    }
                  }} disabled={staffPage === 0}>
                    <span style={{ fontSize: 28 }}>⬅️</span>
                  </IconButton>
                  <Typography sx={{ mx: 2, fontWeight: 'bold', color: '#6A1B9A' }}>
                    Page {staffPage + 1} of {Math.max(1, Math.ceil(staffList.length / STAFFS_PER_PAGE))}
                  </Typography>
                  <IconButton onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    if (setStaffPage) {
                      setStaffPage(p => Math.min(p + 1, Math.ceil(staffList.length / STAFFS_PER_PAGE) - 1));
                    }
                  }} disabled={staffPage >= Math.ceil(staffList.length / STAFFS_PER_PAGE) - 1}>
                    <span style={{ fontSize: 28 }}>➡️</span>
                  </IconButton>
                </Box>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: '#6A1B9A' }}>
                    Total Staff Salary This Month: <b>₹{totalStaffSalary}</b>
                  </Typography>
                  <Typography variant="subtitle1" sx={{ color: '#F44336' }}>
                    Unpaid: <b>₹{unpaidStaffSalary}</b>
                  </Typography>
                </Box>
              </Card>
              {/* Payment History Dialog */}
              <Dialog open={showHistoryDialog} onClose={() => { 
                if (setShowHistoryDialog) {
                  setShowHistoryDialog(false);
                }
              }} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ 
                  bgcolor: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)', 
                  color: '#8E24AA',
                  textAlign: 'center', 
                  fontWeight: 'bold', 
                  fontSize: '1.2rem', 
                  py: 2, 
                  borderTopLeftRadius: 8, 
                  borderTopRightRadius: 8,
                  background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  userSelect: 'none'
                }}>
                  Payment History
                </DialogTitle>
                <DialogContent sx={{ pt: 3, pb: 2, px: 4, bgcolor: 'linear-gradient(135deg, #f3e5f5 0%, #ede7f6 100%)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
                  {historyStaffIndex === null ? (
                    // All staff summary view
                    <>
                      {/* Search and Summary Controls Card */}
                      <Paper elevation={3} sx={{ p: 2.5, mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)' }}>
                        <TextField
                          label="Search Staff"
                          value={staffHistorySearch}
                          onChange={e => setStaffHistorySearch(e.target.value)}
                          fullWidth
                          size="small"
                          sx={{ mb: 2, bgcolor: '#fff', borderRadius: 2 }}
                          InputProps={{ startAdornment: <InputAdornment position="start">👤</InputAdornment> }}
                        />
                        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Year</InputLabel>
                            <Select
                              value={summaryYear !== null ? String(summaryYear) : ''}
                              label="Year"
                              onChange={e => setSummaryYear(e.target.value === '' ? null : Number(e.target.value))}
                            >
                              <MenuItem value="">All Years</MenuItem>
                              {Array.from(new Set(staffList.flatMap(staff => staff.paymentHistory.map(h => h.year)))).map(y => (
                                <MenuItem key={y} value={y}>{y}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Month</InputLabel>
                            <Select
                              value={summaryMonth !== null ? String(summaryMonth) : ''}
                              label="Month"
                              onChange={e => setSummaryMonth(e.target.value === '' ? null : Number(e.target.value))}
                              disabled={summaryYear === null}
                            >
                              <MenuItem value="">All Months</MenuItem>
                              {summaryYear !== null && Array.from(new Set(staffList.flatMap(staff => staff.paymentHistory.filter(h => h.year === summaryYear).map(h => h.month)))).sort((a, b) => a - b).map(m => (
                                <MenuItem key={m} value={m}>{new Date(2024, m, 1).toLocaleString('en-GB', { month: 'short' })}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Button size="small" onClick={() => { setSummaryMonth(null); setSummaryYear(null); }}>Reset</Button>
                        </Box>
                        {/* Enhanced Summary Totals */}
                        <Box sx={{ display: 'flex', gap: 3, mb: 1 }}>
                          {(() => {
                            let salaryTotal = 0, upadTotal = 0, leaveTotal = 0;
                            staffList.forEach(staff => {
                              const t = getStaffTotals(
                                staff,
                                summaryMonth !== null && summaryYear !== null
                                  ? { month: summaryMonth, year: summaryYear }
                                  : summaryYear !== null
                                    ? { year: summaryYear }
                                    : {}
                              );
                              salaryTotal += t.salaryTotal;
                              upadTotal += t.upadTotal;
                              leaveTotal += t.leaveTotal;
                            });
                            return (
                              <>
                                <Paper elevation={2} sx={{ p: 2, borderRadius: 2, minWidth: 120, bgcolor: 'linear-gradient(135deg, #e1bee7 0%, #fff 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <Typography variant="subtitle2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <AttachMoney sx={{ color: '#6A1B9A', fontSize: 20 }} /> Salary
                                  </Typography>
                                  <Typography variant="h6" color="primary">₹{salaryTotal}</Typography>
                                </Paper>
                                <Paper elevation={2} sx={{ p: 2, borderRadius: 2, minWidth: 120, bgcolor: 'linear-gradient(135deg, #b2dfdb 0%, #fff 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <Typography variant="subtitle2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <TrendingDown sx={{ color: '#009688', fontSize: 20 }} /> Upad
                                  </Typography>
                                  <Typography variant="h6" sx={{ color: '#009688', fontWeight: 'bold' }}>₹{upadTotal}</Typography>
                                </Paper>
                                <Paper elevation={2} sx={{ p: 2, borderRadius: 2, minWidth: 120, bgcolor: 'linear-gradient(135deg, #ffe082 0%, #fff 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <Typography variant="subtitle2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <DateRange sx={{ color: '#ffb300', fontSize: 20 }} /> Leave
                                  </Typography>
                                  <Typography variant="h6" color="warning.main">{leaveTotal} days</Typography>
                                </Paper>
                              </>
                            );
                          })()}
                        </Box>
                      </Paper>
                      <Divider sx={{ mb: 2 }} />
                      {/* Table of all staff summary, filtered by search */}
                      <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #fff 80%, #ede7f6 100%)' }}>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ background: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)' }}>
                              <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Name</TableCell>
                              <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Total Salary</TableCell>
                              <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Total Upad</TableCell>
                              <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Total Leave</TableCell>
                              <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Days Worked</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {staffList
                              .filter(staff => staff.name.toLowerCase().includes(staffHistorySearch.toLowerCase()))
                              .map((staff, i) => {
                                const t = getStaffTotals(
                                  staff,
                                  summaryMonth !== null && summaryYear !== null
                                    ? { month: summaryMonth, year: summaryYear }
                                    : summaryYear !== null
                                      ? { year: summaryYear }
                                      : {}
                                );
                                return (
                                                    <TableRow key={i} hover style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      if (setHistoryStaffIndex && setSummaryMonth && setSummaryYear && setStaffHistorySearch) {
                        setHistoryStaffIndex(i); 
                        setSummaryMonth(null); 
                        setSummaryYear(null); 
                        setStaffHistorySearch(''); 
                      }
                    }}
                    sx={{ '&:hover': { background: 'linear-gradient(90deg, #ede7f6 0%, #fff 100%)' } }}
                  >
                                    <TableCell>{staff.name}</TableCell>
                                    <TableCell>₹{t.salaryTotal}</TableCell>
                                    <TableCell>₹{t.upadTotal}</TableCell>
                                    <TableCell>{t.leaveTotal} days</TableCell>
                                    <TableCell>{t.daysWorked}</TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  ) : (
                    // Single staff view (existing)
                    historyStaffIndex !== null && staffList[historyStaffIndex] && (
                      <>
                        <Button size="small" sx={{ mb: 2 }} onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          if (setHistoryStaffIndex && setSummaryMonth && setSummaryYear && setStaffHistorySearch) {
                            setHistoryStaffIndex(null); 
                            setSummaryMonth(null); 
                            setSummaryYear(null); 
                            setStaffHistorySearch(''); 
                          }
                        }}>← Back to All Staff</Button>
                        {/* Enhanced Single Staff Summary */}
                        <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                          {(() => {
                            const { salaryTotal, upadTotal, leaveTotal, daysWorked } = getStaffTotals(
                              staffList[historyStaffIndex],
                              summaryMonth !== null && summaryYear !== null
                                ? { month: summaryMonth, year: summaryYear }
                                : summaryYear !== null
                                  ? { year: summaryYear }
                                  : {}
                            );
                            return (
                              <>
                                <Paper elevation={2} sx={{ p: 2, borderRadius: 2, minWidth: 120, bgcolor: 'linear-gradient(135deg, #e1bee7 0%, #fff 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <Typography variant="subtitle2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <AttachMoney sx={{ color: '#6A1B9A', fontSize: 20 }} /> Salary
                                  </Typography>
                                  <Typography variant="h6" color="primary">₹{salaryTotal}</Typography>
                                </Paper>
                                <Paper elevation={2} sx={{ p: 2, borderRadius: 2, minWidth: 120, bgcolor: 'linear-gradient(135deg, #b2dfdb 0%, #fff 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <Typography variant="subtitle2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <TrendingDown sx={{ color: '#009688', fontSize: 20 }} /> Upad
                                  </Typography>
                                  <Typography variant="h6" sx={{ color: '#009688', fontWeight: 'bold' }}>₹{upadTotal}</Typography>
                                </Paper>
                                <Paper elevation={2} sx={{ p: 2, borderRadius: 2, minWidth: 120, bgcolor: 'linear-gradient(135deg, #ffe082 0%, #fff 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <Typography variant="subtitle2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <DateRange sx={{ color: '#ffb300', fontSize: 20 }} /> Leave
                                  </Typography>
                                  <Typography variant="h6" color="warning.main">{leaveTotal} days</Typography>
                                </Paper>
                                <Paper elevation={2} sx={{ p: 2, borderRadius: 2, minWidth: 120, bgcolor: 'linear-gradient(135deg, #c8e6c9 0%, #fff 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <Typography variant="subtitle2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <TrendingUp sx={{ color: '#388e3c', fontSize: 20 }} /> Days Worked
                                  </Typography>
                                  <Typography variant="h6" color="success.main">{daysWorked}</Typography>
                                </Paper>
                              </>
                            );
                          })()}
                        </Box>
                        {/* Summary Controls */}
                        <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2, background: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)' }}>
                          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                              <InputLabel>Year</InputLabel>
                              <Select
                                value={summaryYear !== null ? String(summaryYear) : ''}
                                label="Year"
                                onChange={e => setSummaryYear(e.target.value === '' ? null : Number(e.target.value))}
                              >
                                <MenuItem value="">All Years</MenuItem>
                                {Array.from(new Set(staffList[historyStaffIndex].paymentHistory.map(h => h.year))).map(y => (
                                  <MenuItem key={y} value={y}>{y}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                              <InputLabel>Month</InputLabel>
                              <Select
                                value={summaryMonth !== null ? String(summaryMonth) : ''}
                                label="Month"
                                onChange={e => setSummaryMonth(e.target.value === '' ? null : Number(e.target.value))}
                                disabled={summaryYear === null}
                              >
                                <MenuItem value="">All Months</MenuItem>
                                {summaryYear !== null && Array.from(new Set(staffList[historyStaffIndex].paymentHistory.filter(h => h.year === summaryYear).map(h => h.month))).sort((a, b) => a - b).map(m => (
                                  <MenuItem key={m} value={m}>{new Date(2024, m, 1).toLocaleString('en-GB', { month: 'short' })}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <Button size="small" onClick={(e) => { 
                              e.preventDefault(); 
                              e.stopPropagation(); 
                              if (setSummaryMonth && setSummaryYear) {
                                setSummaryMonth(null); 
                                setSummaryYear(null); 
                              }
                            }}>Reset</Button>
                          </Box>
                        </Paper>
                        {/* Existing payment history table */}
                        <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #fff 80%, #ede7f6 100%)' }}>
                          <Table>
                            <TableHead>
                              <TableRow sx={{ background: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)' }}>
                                <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Month</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Year</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Amount</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Paid Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Type</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {staffList[historyStaffIndex].paymentHistory.map((h, i) => (
                                <TableRow key={i}>
                                  <TableCell>{new Date(2024, h.month, 1).toLocaleString('en-GB', { month: 'short' })}</TableCell>
                                  <TableCell>{h.year}</TableCell>
                                  <TableCell>₹{h.amount}</TableCell>
                                  <TableCell>{h.paidDate}</TableCell>
                                  <TableCell>{h.type === 'upad' ? 'Upad' : 'Salary'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )
                  )}
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
                  <Button onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    if (setShowHistoryDialog) {
                      setShowHistoryDialog(false);
                    }
                  }} sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Close</Button>
                </DialogActions>
              </Dialog>
              <Dialog open={showStaffDialog} onClose={() => setShowStaffDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ 
                  bgcolor: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)', 
                  color: '#8E24AA',
                  textAlign: 'center', 
                  fontWeight: 'bold', 
                  fontSize: '1.2rem', 
                  py: 2, 
                  borderTopLeftRadius: 8, 
                  borderTopRightRadius: 8,
                  background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  userSelect: 'none'
                }}>
                  Add Staff Member
                </DialogTitle>
                <DialogContent sx={{ pt: 3, pb: 2, px: 4, bgcolor: 'linear-gradient(135deg, #f3e5f5 0%, #ede7f6 100%)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
                  <Card sx={{ p: 3, borderRadius: 4, boxShadow: 6, background: 'linear-gradient(135deg, #fff 60%, #ede7f6 100%)', mb: 2, maxWidth: 500, mx: 'auto' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <TextField
                        label="Staff Name"
                        value={staffForm.name}
                        onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && staffForm.name && staffForm.salary) handleAddStaff();
                        }}
                        fullWidth
                        required
                        InputProps={{ startAdornment: <InputAdornment position="start">👤</InputAdornment> }}
                        sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}
                      />
                      <TextField
                        label="Monthly Salary"
                        type="number"
                        value={staffForm.salary}
                        onChange={e => setStaffForm({ ...staffForm, salary: e.target.value })}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && staffForm.name && staffForm.salary) handleAddStaff();
                        }}
                        fullWidth
                        required
                        InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                        sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}
                      />
                    </Box>
                  </Card>
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
                  <Button onClick={() => setShowStaffDialog(false)} sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Cancel</Button>
                  <Button onClick={handleAddStaff} variant="contained" sx={{ bgcolor: '#6A1B9A', color: 'white', fontWeight: 'bold', px: 3, py: 1, fontSize: '1rem', borderRadius: 2, boxShadow: '0 4px 16px rgba(106, 27, 154, 0.18)', '&:hover': { bgcolor: '#4A148C' } }}>Add</Button>
                </DialogActions>
              </Dialog>
              {/* Upad Dialog */}
              <Dialog open={showUpadDialog} onClose={() => setShowUpadDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ 
                  bgcolor: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)', 
                  color: '#8E24AA',
                  textAlign: 'center', 
                  fontWeight: 'bold', 
                  fontSize: '1.2rem', 
                  py: 2, 
                  borderTopLeftRadius: 8, 
                  borderTopRightRadius: 8,
                  background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  userSelect: 'none'
                }}>
                  Enter Upad Amount
                </DialogTitle>
                <DialogContent sx={{ pt: 3, pb: 2, px: 4, bgcolor: 'linear-gradient(135deg, #f3e5f5 0%, #ede7f6 100%)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
                  <Card sx={{ p: 3, borderRadius: 4, boxShadow: 6, background: 'linear-gradient(135deg, #fff 60%, #ede7f6 100%)', mb: 2, maxWidth: 400, mx: 'auto' }}>
                    <TextField
                      label="Upad Amount"
                      type="number"
                      value={upadAmount}
                      onChange={e => setUpadAmount(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && upadAmount) handleUpadSubmit();
                      }}
                      fullWidth
                      required
                      InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                      sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}
                    />
                  </Card>
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
                  <Button onClick={() => setShowUpadDialog(false)} sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Cancel</Button>
                  <Button onClick={handleUpadSubmit} variant="contained" sx={{ bgcolor: '#6A1B9A', color: 'white', fontWeight: 'bold', px: 3, py: 1, fontSize: '1rem', borderRadius: 2, boxShadow: '0 4px 16px rgba(106, 27, 154, 0.18)', '&:hover': { bgcolor: '#4A148C' } }}>Add Upad</Button>
                </DialogActions>
              </Dialog>
            </Box>
          )}

          {/* User Management Section */}
          {activeSection === 'users' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>
                    👥 User Management
                  </Typography>
                    <IconButton
                      onClick={handleRefresh}
                      disabled={refreshing}
                      size="small"
                      sx={{
                        color: '#6A1B9A',
                        '&:hover': {
                          bgcolor: 'rgba(106, 27, 154, 0.08)'
                        },
                        '&:disabled': {
                          color: 'rgba(106, 27, 154, 0.5)'
                        }
                      }}
                    >
                      {refreshing ? (
                        <CircularProgress size={18} sx={{ color: '#6A1B9A' }} />
                      ) : (
                        <Refresh fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    Add and manage managers for your restaurant (Maximum 2 managers allowed)
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ 
                      color: restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length >= 2 ? '#f44336' : '#4caf50',
                      fontWeight: 'bold'
                    }}>
                      Active Managers: {restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length}/2
                  </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Tooltip 
                    title={restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length >= 2 
                      ? "You have reached the maximum limit of 2 active managers. Remove an existing manager to add a new one." 
                      : "Add a new manager to your restaurant"}
                    arrow
                  >
                    <span>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                        disabled={restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length >= 2}
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      if (setShowUserDialog) {
                        setShowUserDialog(true);
                      }
                    }}
                    sx={{
                          background: restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length >= 2 
                            ? 'linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%)' 
                            : 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
                          '&:hover': { 
                            background: restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length >= 2 
                              ? 'linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%)' 
                              : 'linear-gradient(135deg, #4A148C 0%, #6A1B9A 100%)' 
                          },
                      px: 3,
                      py: 1.5,
                      borderRadius: 2,
                          boxShadow: restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length >= 2 
                            ? '0 6px 20px rgba(189, 189, 189, 0.3)' 
                            : '0 6px 20px rgba(106, 27, 154, 0.3)',
                      textTransform: 'none',
                          fontSize: '1rem',
                          '&.Mui-disabled': {
                            color: 'white',
                            background: 'linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%)'
                          }
                    }}
                  >
                        {restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length >= 2 ? 'Manager Limit Reached' : 'Add Manager'}
                  </Button>
                    </span>
                  </Tooltip>
                  {restaurantUsers.some(user => user.role === 'owner' && !user.isActive) && (
                    <Button
                      variant="outlined"
                      onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      if (fixOwnerStatus) {
                        fixOwnerStatus();
                      }
                    }}
                      sx={{
                        borderColor: '#f57c00',
                        color: '#f57c00',
                        '&:hover': { 
                          borderColor: '#ff9800',
                          backgroundColor: 'rgba(255, 152, 0, 0.1)'
                        },
                        px: 2,
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '0.9rem'
                      }}
                    >
                      Fix Owner Status
                    </Button>
                  )}
                </Box>
              </Box>

              <Card sx={{ p: 3, borderRadius: 3, boxShadow: 4, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#6A1B9A' }}>Restaurant Users</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {restaurantUsers.map((user) => (
                        <TableRow key={user.id} sx={{ '&:nth-of-type(odd)': { bgcolor: '#fafafa' } }}>
                          <TableCell>{user.displayName}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              color={user.role === 'owner' ? 'primary' : 'secondary'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{user.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                          <TableCell>
                            <Chip
                              label={user.isActive ? 'Active' : 'Inactive'}
                              color={user.isActive ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              {user.role === 'manager' && (
                                <>
                                  <Tooltip 
                                    title={!user.isActive && restaurantUsers.filter(u => u.role === 'manager' && u.isActive).length >= 2 
                                      ? "Maximum limit of 2 active managers reached. Deactivate another manager first." 
                                      : user.isActive ? "Deactivate this manager" : "Activate this manager"}
                                    arrow
                                  >
                                    <span>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                        disabled={!user.isActive && restaurantUsers.filter(u => u.role === 'manager' && u.isActive).length >= 2}
                                    onClick={(e) => { 
                                      e.preventDefault(); 
                                      e.stopPropagation(); 
                                      if (handleToggleUserStatus && user?.id !== undefined) {
                                        handleToggleUserStatus(user.id, user.isActive);
                                      }
                                    }}
                                    sx={{ 
                                      minWidth: 'auto',
                                          color: user.isActive ? '#f57c00' : 
                                                (!user.isActive && restaurantUsers.filter(u => u.role === 'manager' && u.isActive).length >= 2 ? '#bdbdbd' : '#4caf50'),
                                          borderColor: user.isActive ? '#f57c00' : 
                                                      (!user.isActive && restaurantUsers.filter(u => u.role === 'manager' && u.isActive).length >= 2 ? '#bdbdbd' : '#4caf50')
                                    }}
                                  >
                                    {user.isActive ? 'Deactivate' : 'Activate'}
                                  </Button>
                                    </span>
                                  </Tooltip>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    onClick={(e) => { 
                                      e.preventDefault(); 
                                      e.stopPropagation(); 
                                      if (handleRemoveUser && user?.id && user?.displayName) {
                                        handleRemoveUser(user.id, user.displayName);
                                      }
                                    }}
                                    sx={{ minWidth: 'auto' }}
                                  >
                                    Remove
                                  </Button>
                                </>
                              )}
                              {user.role === 'owner' && (
                                <Typography variant="body2" color="textSecondary">
                                  Owner
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                      {restaurantUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                            <Typography color="textSecondary">
                              No users found. Add a manager to get started.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Typography variant="body2" sx={{ color: '#6A1B9A' }}>
                      👑 Owners: <b>{restaurantUsers.filter(user => user.role === 'owner').length}</b>
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6A1B9A' }}>
                      👨‍💼 Active Managers: <b>{restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length}/2</b>
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#f57c00' }}>
                      ⏸️ Inactive Managers: <b>{restaurantUsers.filter(user => user.role === 'manager' && !user.isActive).length}</b>
                    </Typography>
                  </Box>
                  <Typography variant="subtitle1" sx={{ color: '#6A1B9A' }}>
                    Total Users: <b>{restaurantUsers.length}</b>
                  </Typography>
                </Box>
              </Card>

              {/* Add User Dialog */}
                              <Dialog open={showUserDialog} onClose={() => { 
                  if (setShowUserDialog) {
                    setShowUserDialog(false);
                  }
                }} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ 
                  bgcolor: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)', 
                  color: '#8E24AA',
                  textAlign: 'center', 
                  fontWeight: 'bold', 
                  fontSize: '1.2rem', 
                  py: 2, 
                  borderTopLeftRadius: 8, 
                  borderTopRightRadius: 8,
                  background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  userSelect: 'none'
                }}>
                  Add New Manager
                </DialogTitle>
                <DialogContent sx={{ pt: 3, pb: 2, px: 4, bgcolor: 'linear-gradient(135deg, #f3e5f5 0%, #ede7f6 100%)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
                  <Card sx={{ p: 3, borderRadius: 4, boxShadow: 6, background: 'linear-gradient(135deg, #fff 60%, #ede7f6 100%)', mb: 2, maxWidth: 500, mx: 'auto' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <TextField
                        label="Full Name"
                        value={userFormData.displayName}
                        onChange={e => setUserFormData({ ...userFormData, displayName: e.target.value })}
                        fullWidth
                        required
                        InputProps={{ startAdornment: <InputAdornment position="start">👤</InputAdornment> }}
                        sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}
                      />
                      <TextField
                        label="Email Address"
                        type="email"
                        value={userFormData.email}
                        onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                        fullWidth
                        required
                        InputProps={{ startAdornment: <InputAdornment position="start">✉️</InputAdornment> }}
                        sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}
                      />
                      <TextField
                        label="Password"
                        type="password"
                        value={userFormData.password}
                        onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                        fullWidth
                        required
                        InputProps={{ startAdornment: <InputAdornment position="start">🔒</InputAdornment> }}
                        sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}
                      />
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Manager Limit:</strong> You can add up to 2 active managers for your restaurant. 
                          Currently {restaurantUsers.filter(user => user.role === 'manager' && user.isActive).length}/2 manager slots are used.
                        </Typography>
                      </Alert>
                      <Alert severity="success" sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          <strong>Automatic User Creation:</strong> The manager will be created automatically with full access. 
                          They can login immediately with these credentials.
                        </Typography>
                      </Alert>
                    </Box>
                  </Card>
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
                  <Button onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    if (setShowUserDialog) {
                      setShowUserDialog(false);
                    }
                  }} sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Cancel</Button>
                  <Button 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      if (handleAddUser) {
                        handleAddUser();
                      }
                    }} 
                    variant="contained" 
                    disabled={loadingUserOperation}
                    sx={{ bgcolor: '#6A1B9A', color: 'white', fontWeight: 'bold', px: 3, py: 1, fontSize: '1rem', borderRadius: 2, boxShadow: '0 4px 16px rgba(106, 27, 154, 0.18)', '&:hover': { bgcolor: '#4A148C' } }}
                  >
                    {loadingUserOperation ? 'Adding...' : 'Add Manager'}
                  </Button>
                </DialogActions>
              </Dialog>
            </Box>
          )}
        </Box>
      </Box>
      </Box>

    {/* Menu Item Dialog */}
      <Dialog 
        open={isMenuDialogOpen} 
        onClose={handleMenuDialogClose} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
        scroll="body"
        PaperProps={{
          sx: {
            maxHeight: '90vh',
            overflow: 'hidden'
          }
        }}
      >
      <DialogTitle sx={{
        bgcolor: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
        color: '#8E24AA',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '1.5rem',
        letterSpacing: 1,
        py: 2,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        userSelect: 'none'
      }}>
          {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
        </DialogTitle>
      <DialogContent sx={{
        pt: 2,
        pb: 1,
        px: 3,
        bgcolor: 'linear-gradient(135deg, #f3e5f5 0%, #ede7f6 100%)',
        overflow: 'hidden'
      }}>
        <Card sx={{
          p: 3,
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(106, 27, 154, 0.12)',
          background: 'linear-gradient(135deg, #fff 80%, #f8f9ff 100%)',
          mb: 2,
          maxWidth: 850,
          mx: 'auto',
          border: '1px solid rgba(106, 27, 154, 0.08)',
        }}>
          {/* Compact Header */}
          <Typography variant="h6" sx={{ 
            color: '#6A1B9A', 
            fontWeight: 'bold',
            mb: 3,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1
          }}>
            🍽️ {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
          </Typography>

          {/* All Fields in Compact Grid Layout */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2.5, mb: 3 }}>
            <TextField
              label="Item Number"
              value={menuFormData.itemNo}
              onChange={(e) => setMenuFormData({ ...menuFormData, itemNo: e.target.value })}
              required
              size="small"
              InputProps={{ startAdornment: <InputAdornment position="start">#</InputAdornment> }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControl required size="small" sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={menuFormData.category}
                onChange={(e) => setMenuFormData({ ...menuFormData, category: e.target.value })}
                label="Category"
                startAdornment={<InputAdornment position="start">🍽️</InputAdornment>}
              >
                  {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>
              <Tooltip title="Manage Categories">
                <IconButton 
                  onClick={() => setCategoryDialogOpen(true)}
                  size="small"
                  sx={{ 
                    bgcolor: '#FF9800', 
                    color: 'white',
                    '&:hover': { bgcolor: '#F57C00' }
                  }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <TextField
              label="Item Name"
              value={menuFormData.name}
              onChange={(e) => setMenuFormData({ ...menuFormData, name: e.target.value })}
              required
              size="small"
              InputProps={{ startAdornment: <InputAdornment position="start">🔤</InputAdornment> }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>

          {/* Description - Full Width */}
          <TextField
            label="Description (Optional)"
            value={menuFormData.description}
            onChange={(e) => setMenuFormData({ ...menuFormData, description: e.target.value })}
            multiline
            rows={2}
            fullWidth
            size="small"
            placeholder="Brief item description"
            InputProps={{ startAdornment: <InputAdornment position="start">📝</InputAdornment> }}
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': { borderRadius: 2 }
            }}
          />

          {/* Pricing in Compact Two-Column Layout */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
            {/* Common Hall Prices */}
            <Box sx={{ 
              p: 2.5, 
              border: '1px solid #4CAF50', 
              borderRadius: 2, 
              bgcolor: '#f8fdf8'
            }}>
              <Typography variant="body2" sx={{ 
                fontWeight: 'bold', 
                color: '#2E7D32', 
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: '0.9rem'
              }}>
                🏠 Common Hall Prices
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  label="Private"
                  type="number"
                  value={menuFormData.privatePrice}
                  onChange={(e) => setMenuFormData({ ...menuFormData, privatePrice: e.target.value })}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  inputProps={{ min: 0, step: 0.01 }}
                  required
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: 'white',
                      '&:hover fieldset': { borderColor: '#4CAF50' },
                      '&.Mui-focused fieldset': { borderColor: '#4CAF50' },
                    },
                  }}
                />
                <TextField
                  label="Loading"
                  type="number"
                  value={menuFormData.loadingPrice}
                  onChange={(e) => setMenuFormData({ ...menuFormData, loadingPrice: e.target.value })}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  inputProps={{ min: 0, step: 0.01 }}
                  required
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: 'white',
                      '&:hover fieldset': { borderColor: '#4CAF50' },
                      '&.Mui-focused fieldset': { borderColor: '#4CAF50' },
                    },
                  }}
                />
              </Box>
            </Box>

            {/* AC Hall Price */}
            <Box sx={{ 
              p: 2.5, 
              border: '1px solid #2196F3', 
              borderRadius: 2, 
              bgcolor: '#f3f8ff'
            }}>
              <Typography variant="body2" sx={{ 
                fontWeight: 'bold', 
                color: '#1565C0', 
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: '0.9rem'
              }}>
                ❄️ AC Hall Price
              </Typography>
              <TextField
                label="AC Price"
                type="number"
                value={menuFormData.acHallPrice}
                onChange={(e) => setMenuFormData({ ...menuFormData, acHallPrice: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                inputProps={{ min: 0, step: 0.01 }}
                size="small"
                fullWidth
                helperText="Same for P & L"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: 'white',
                    '&:hover fieldset': { borderColor: '#2196F3' },
                    '&.Mui-focused fieldset': { borderColor: '#2196F3' },
                  },
                  '& .MuiFormHelperText-root': {
                    fontSize: '0.7rem',
                    textAlign: 'center',
                    mt: 0.5
                  }
                }}
              />
            </Box>
          </Box>
        </Card>
        </DialogContent>
      <DialogActions sx={{
        p: 2,
        bgcolor: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        justifyContent: 'center',
        gap: 2
      }}>
        <Button onClick={handleMenuDialogClose} sx={{ fontWeight: 'bold', color: '#6A1B9A', px: 3 }}>Cancel</Button>
        <Button 
          onClick={handleSaveMenuItem} 
          variant="contained" 
          disabled={loading}
          sx={{ 
            bgcolor: '#6A1B9A',
            color: 'white',
            fontWeight: 'bold',
            px: 4,
            py: 1.2,
            fontSize: '1rem',
            borderRadius: 2,
            boxShadow: '0 4px 16px rgba(106, 27, 154, 0.18)',
            '&:hover': { bgcolor: '#4A148C' }
          }}
        >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

    {/* Expense Dialog */}
    <Dialog open={isExpenseDialogOpen} onClose={() => setIsExpenseDialogOpen(false)} maxWidth="sm" fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle sx={{
        bgcolor: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
        color: '#8E24AA',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '1.4rem',
        letterSpacing: 1,
        py: 3,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        userSelect: 'none'
      }}>
        Add Raw Material Expense
      </DialogTitle>
      <DialogContent sx={{
        pt: 4,
        pb: 2,
        px: 4,
        bgcolor: 'linear-gradient(135deg, #f3e5f5 0%, #ede7f6 100%)',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16
      }}>
        <Card sx={{
          p: 3,
          borderRadius: 4,
          boxShadow: 6,
          background: 'linear-gradient(135deg, #fff 60%, #ede7f6 100%)',
          mb: 2,
          maxWidth: 600,
          mx: 'auto',
        }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
          <TextField
            label="Date"
            type="date"
            value={expenseFormData.date}
            onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            required
              InputProps={{ startAdornment: <InputAdornment position="start">📅</InputAdornment> }}
          />
            <FormControl required>
            <InputLabel>Category</InputLabel>
            <Select
              value={expenseFormData.category}
              onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
              label="Category"
                startAdornment={<InputAdornment position="start">📦</InputAdornment>}
            >
              <MenuItem value="Vegetables">Vegetables</MenuItem>
              <MenuItem value="Dairy">Dairy Products</MenuItem>
              <MenuItem value="Meat">Meat & Seafood</MenuItem>
              <MenuItem value="Spices">Spices & Seasonings</MenuItem>
              <MenuItem value="Other">Other Kitchen Supplies</MenuItem>
            </Select>
          </FormControl>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3, mb: 3 }}>
          <TextField
            label="Description"
            value={expenseFormData.description}
            onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
            placeholder="e.g., Fresh tomatoes, chicken breast, etc."
              InputProps={{ startAdornment: <InputAdornment position="start">📝</InputAdornment> }}
          />
          <TextField
            label="Amount"
            type="number"
            value={expenseFormData.amount}
            onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
            inputProps={{ min: 0, step: 0.01 }}
            required
          />
    </Box>
        </Card>
      </DialogContent>
      <DialogActions sx={{
        p: 3,
        bgcolor: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16
      }}>
        <Button onClick={() => setIsExpenseDialogOpen(false)} sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Cancel</Button>
        <Button 
          onClick={handleSaveExpense} 
          variant="contained" 
          disabled={loading}
          sx={{ 
            bgcolor: '#6A1B9A',
            color: 'white',
            fontWeight: 'bold',
            px: 4,
            py: 1.5,
            fontSize: '1.1rem',
            borderRadius: 2,
            boxShadow: '0 4px 16px rgba(106, 27, 154, 0.18)',
            '&:hover': { bgcolor: '#4A148C' }
          }}
        >
          {loading ? 'Saving...' : 'Add Expense'}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Custom Date Selection Dialog */}
    <Dialog open={showCustomDatePicker} onClose={() => setShowCustomDatePicker(false)} maxWidth="md" fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ 
        bgcolor: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)', 
        color: '#8E24AA',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        userSelect: 'none'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <DateRange sx={{ color: '#8E24AA' }} />
          <Typography variant="h6" sx={{
            background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            userSelect: 'none'
          }}>Custom Revenue Analysis</Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Box>
            <Typography variant="h6" sx={{ color: '#6A1B9A', mb: 2 }}>
              🗓️ Option 1: Select Day, Month, and Year
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl sx={{ minWidth: 100 }}>
                <InputLabel>Day</InputLabel>
                <Select
                  value={customDay !== null ? String(customDay) : ''}
                  onChange={e => setCustomDay(e.target.value === '' ? null : Number(e.target.value))}
                  label="Day"
                >
                  <MenuItem value="">(All Days)</MenuItem>
                  {customMonth !== null && customYear && Array.from({ length: new Date(customYear, customMonth + 1, 0).getDate() }, (_, i) => (
                    <MenuItem key={i + 1} value={String(i + 1)}>{i + 1}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel>Month</InputLabel>
                <Select
                  value={customMonth !== null ? String(customMonth) : ''}
                  onChange={e => {
                    const value = e.target.value as string;
                    setCustomMonth(value === '' ? null : Number(value));
                    setCustomDay(null); // Reset day when month changes
                  }}
                  label="Month"
                >
                  <MenuItem value="">(All Months)</MenuItem>
                  {Array.from({ length: 12 }, (_, i) => (
                                            <MenuItem key={i} value={String(i)}>{new Date(2024, i, 1).toLocaleDateString('en-GB', { month: 'short' })}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Year</InputLabel>
                <Select
                  value={customYear}
                  onChange={e => setCustomYear(Number(e.target.value))}
                  label="Year"
                >
                  {Array.from({ length: 20 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <MenuItem key={year} value={year}>{year}</MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  if (customDay && customMonth !== null && customYear) {
                    setCustomDate({ month: customMonth, year: customYear });
                    setSelectedDay(customDay);
                    setDateFilter('customDay');
                  } else if (customMonth !== null && customYear) {
                    setCustomDate({ month: customMonth, year: customYear });
                    setSelectedDay(null);
                    setDateFilter('custom');
                  } else if (customYear) {
                    setCustomDate({ month: 0, year: customYear });
                    setSelectedDay(null);
                    setDateFilter('customYear');
                  }
                  setShowCustomDatePicker(false);
                }}
                sx={{ 
                  background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
                  '&:hover': { 
                    background: 'linear-gradient(135deg, #4A148C 0%, #6A1B9A 100%)'
                  }
                }}
              >
                Apply
              </Button>
            </Box>
          </Box>
          
          {/* Divider */}
          <Box sx={{ position: 'relative', my: 2 }}>
            <Divider />
            <Typography 
              variant="body2" 
              sx={{ 
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                bgcolor: 'white',
                px: 2,
                color: '#666'
              }}
            >
              OR
            </Typography>
          </Box>
          
          {/* Custom Range Section */}
          <Box>
            <Typography variant="h6" sx={{ color: '#6A1B9A', mb: 2 }}>
              📅 Option 2: Select Custom Date Range
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                value={customDateRange.startDate}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': { borderColor: '#6A1B9A' },
                    '&.Mui-focused fieldset': { borderColor: '#6A1B9A' }
                  }
                }}
              />
              <TextField
                label="End Date"
                type="date"
                value={customDateRange.endDate}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': { borderColor: '#6A1B9A' },
                    '&.Mui-focused fieldset': { borderColor: '#6A1B9A' }
                  }
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                disabled={!customDateRange.startDate || !customDateRange.endDate}
                onClick={() => {
                  setDateFilter('customRange');
                  setShowCustomDatePicker(false);
                }}
                sx={{ 
                  background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                  '&:hover': { 
                    background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)'
                  },
                  '&:disabled': {
                    background: '#f0f0f0',
                    color: '#999'
                  }
                }}
              >
                Apply Date Range
              </Button>
            </Box>
          </Box>
          
          {/* Preview Section */}
          <Box sx={{ 
            bgcolor: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', 
            p: 3, 
            borderRadius: 2,
            border: '1px solid #dee2e6'
          }}>
            <Typography variant="body1" sx={{ color: '#6A1B9A', fontWeight: 'bold', mb: 1 }}>
              📋 Preview Analysis Period:
            </Typography>
            {customDateRange.startDate && customDateRange.endDate ? (
              <Box>
                <Typography variant="h6" sx={{ color: '#2c3e50' }}>
                  {new Date(customDateRange.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(customDateRange.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Custom date range analysis
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="h6" sx={{ color: '#2c3e50' }}>
                  {customDay ? `${customDay} ` : ''}{customMonth !== null ? new Date(customYear, customMonth, 1).toLocaleDateString('en-GB', { month: 'short' }) + ' ' : ''}{customYear}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {customDay ? 'Day' : customMonth !== null ? 'Month' : 'Year'} revenue analysis
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, bgcolor: '#f8f9fa' }}>
        <Button 
          onClick={() => setShowCustomDatePicker(false)}
          variant="outlined"
          sx={{ 
            borderColor: '#6c757d',
            color: '#6c757d',
            '&:hover': {
              borderColor: '#495057',
              bgcolor: '#6c757d10'
            }
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>



    {/* Profile Dialog */}
    <Dialog open={showProfileDialog} onClose={() => setShowProfileDialog(false)} maxWidth="sm" fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle sx={{
        bgcolor: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
        color: '#8E24AA',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '1.4rem',
        letterSpacing: 1,
        py: 3,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        userSelect: 'none'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Restaurant sx={{ fontSize: 32, mr: 1, color: '#8E24AA' }} />
          <Typography sx={{
            background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            userSelect: 'none'
          }}>Edit Restaurant Profile</Typography>
        </Box>
        <Typography variant="subtitle2" sx={{ 
          background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          userSelect: 'none',
          mt: 1, 
          fontWeight: 400 
        }}>
          Update your restaurant's details for billing and records
        </Typography>
      </DialogTitle>
      <DialogContent sx={{
        pt: 4,
        pb: 2,
        px: 4,
        bgcolor: 'linear-gradient(135deg, #f3e5f5 0%, #ede7f6 100%)',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16
      }}>
        <Typography variant="h5" sx={{ color: '#6A1B9A', fontWeight: 'bold', textAlign: 'center', mb: 3, letterSpacing: 1 }}>
          Edit Restaurant Profile
        </Typography>
        <Card sx={{
          p: 3,
          borderRadius: 4,
          boxShadow: 6,
          background: 'linear-gradient(135deg, #fff 60%, #ede7f6 100%)',
          mb: 2,
          maxWidth: 600,
          mx: 'auto',
        }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, mb: 3 }}>
            <TextField label="Name" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} fullWidth margin="dense"
              InputProps={{ startAdornment: <InputAdornment position="start"><Restaurant /></InputAdornment> }}
            />
            <TextField label="GSTIN" value={profile.gstin} onChange={e => setProfile({ ...profile, gstin: e.target.value })} fullWidth margin="dense"
              InputProps={{ startAdornment: <InputAdornment position="start">🏷️</InputAdornment> }}
            />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, mb: 3 }}>
            <TextField label="Phone" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} fullWidth margin="dense"
              InputProps={{ startAdornment: <InputAdornment position="start">📞</InputAdornment> }}
            />
            <TextField label="Email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} fullWidth margin="dense"
              InputProps={{ startAdornment: <InputAdornment position="start">📧</InputAdornment> }}
            />
          </Box>
          <TextField label="Address" value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} fullWidth margin="dense"
            multiline rows={2}
            InputProps={{ startAdornment: <InputAdornment position="start">🏠</InputAdornment> }}
            sx={{ mb: 2 }}
          />
        </Card>
      </DialogContent>
      <DialogActions sx={{ p: 3, bgcolor: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
        <Button onClick={() => setShowProfileDialog(false)} sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Cancel</Button>
        <Button onClick={saveProfile} variant="contained" sx={{ bgcolor: '#6A1B9A', color: 'white', fontWeight: 'bold', px: 4, py: 1.5, fontSize: '1.1rem', borderRadius: 2, boxShadow: '0 4px 16px rgba(106, 27, 154, 0.18)', '&:hover': { bgcolor: '#4A148C' } }}>Save</Button>
      </DialogActions>
          </Dialog>

      {/* Category Management Dialog */}
      <Dialog 
        open={categoryDialogOpen} 
        onClose={() => setCategoryDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{
          bgcolor: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
          color: '#F57C00',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '1.4rem',
          letterSpacing: 1,
          py: 3,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          userSelect: 'none'
        }}>
          🏷️ Manage Menu Categories
        </DialogTitle>
        <DialogContent sx={{
          pt: 4,
          pb: 2,
          px: 4,
          bgcolor: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16
        }}>
          <Card sx={{
            p: 3,
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(255, 152, 0, 0.12)',
            bgcolor: 'white',
            border: '1px solid rgba(255, 152, 0, 0.1)'
          }}>
            {/* Add New Category */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#FF9800', mb: 2, fontWeight: 'bold' }}>
                Add New Category
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Category Name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  fullWidth
                  size="small"
                  InputProps={{ 
                    startAdornment: <InputAdornment position="start">🏷️</InputAdornment> 
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': { borderColor: '#FF9800' },
                      '&.Mui-focused fieldset': { borderColor: '#FF9800' },
                    },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  sx={{
                    bgcolor: '#FF9800',
                    color: 'white',
                    px: 3,
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#F57C00' }
                  }}
                >
                  Add
                </Button>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Current Categories */}
            <Box>
              <Typography variant="h6" sx={{ color: '#FF9800', mb: 2, fontWeight: 'bold' }}>
                Current Categories ({categories.length})
              </Typography>
              {categories.length === 0 ? (
                <Typography color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                  No categories found
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {categories.map((category, index) => {
                    const itemCount = menuItems.filter(item => item.category === category).length;
                    return (
                      <Chip
                        key={category}
                        label={`${category} (${itemCount} items)`}
                        onDelete={itemCount === 0 ? () => handleDeleteCategory(category) : undefined}
                        deleteIcon={itemCount === 0 ? <Delete /> : undefined}
                        sx={{
                          bgcolor: itemCount > 0 ? '#e8f5e8' : '#fff3e0',
                          color: itemCount > 0 ? '#2e7d32' : '#FF9800',
                          border: `1px solid ${itemCount > 0 ? '#4caf50' : '#FF9800'}`,
                          fontWeight: 'bold',
                          '& .MuiChip-deleteIcon': {
                            color: '#F44336',
                            '&:hover': { color: '#D32F2F' }
                          }
                        }}
                      />
                    );
                  })}
                </Box>
              )}
            </Box>

            {/* Help Text */}
            <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="caption" color="textSecondary">
                💡 <strong>Tips:</strong><br />
                • Categories with menu items cannot be deleted<br />
                • New categories from CSV imports are automatically added<br />
                • Categories help organize your menu for better navigation
              </Typography>
            </Box>
          </Card>
        </DialogContent>
        <DialogActions sx={{
          p: 2,
          bgcolor: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16,
          justifyContent: 'center'
        }}>
          <Button 
            onClick={() => setCategoryDialogOpen(false)} 
            sx={{ 
              fontWeight: 'bold', 
              color: '#FF9800', 
              px: 3 
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSV Import Dialog */}
    <Dialog open={csvDialogOpen} onClose={() => setCsvDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)', color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', py: 2, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
        Import Menu Items from CSV
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2, px: 4, bgcolor: 'linear-gradient(135deg, #f3e5f5 0%, #ede7f6 100%)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadCsvTemplate}
            sx={{ borderColor: '#6A1B9A', color: '#6A1B9A', fontWeight: 'bold', borderRadius: 2 }}
          >
            Download CSV Template
          </Button>
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadFileIcon />}
            sx={{ borderColor: '#6A1B9A', color: '#6A1B9A', fontWeight: 'bold', borderRadius: 2 }}
          >
            Select CSV File
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  setCsvFile(e.target.files[0]);
                  setCsvError('');
                  setCsvPreview([]);
                }
              }}
            />
          </Button>
          {csvFile && <Typography variant="body2">Selected file: {csvFile.name}</Typography>}
          {csvError && <Alert severity="error">{csvError}</Alert>}
          {/* Preview table will go here in next step */}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, bgcolor: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
        <Button onClick={() => setCsvDialogOpen(false)} sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Cancel</Button>
        <Button
          onClick={handleImportCsvMenu}
          variant="contained"
          disabled={!csvPreview.length || !!csvError || loading}
          sx={{ bgcolor: '#6A1B9A', color: 'white', fontWeight: 'bold', px: 3, py: 1, fontSize: '1rem', borderRadius: 2, boxShadow: '0 4px 16px rgba(106, 27, 154, 0.18)', '&:hover': { bgcolor: '#4A148C' } }}
        >
          {loading ? 'Importing...' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default OwnerDashboard; 