/**
 * OwnerDashboard - Main dashboard for restaurant owners
 * 
 * REFACTORING COMPLETED:
 * - ✅ Revenue Analytics Cards: Using RevenueDashboard component
 * - ✅ Charts: Replaced inline charts with reusable RevenueChart component  
 * - ✅ Top Selling Items: Replaced inline ranking with reusable TopSellingItems component
 * - ✅ Monthly Chart: Using RevenueChart component with bar type
 * - ✅ Other Management Sections: Already using proper components (MenuManagement, ExpenseManagement, etc.)
 * 
 * This refactoring removed ~200 lines of duplicate code and improved maintainability
 */
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
import AutorenewIcon from '@mui/icons-material/Autorenew';
import RevenueDashboard from './revenue/RevenueDashboard';
import SubscriptionManagement from './subscription/SubscriptionManagement';
import SubscriptionGate from './SubscriptionGate';
import MenuManagement from './menu/MenuManagement';
import ExpenseManagement from './expenses/ExpenseManagement';
import ExpenseDialog from './expenses/ExpenseDialog';
import BillHistory from './bills/BillHistory';
import UserManagement from './users/UserManagement';
import StaffManagement from './staff/StaffManagement';
import { calculateAnalytics as calculateAnalyticsUtil, getDateRange } from './revenue/analyticsUtils';
// Import reusable components to replace duplicate code
import RevenueChart from './revenue/RevenueChart';
import TopSellingItems from './revenue/TopSellingItems';
import DateRangeBanner from './common/DateRangeBanner';

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
import { db } from '../../config/firebase';
import { MenuItem as MenuItemType, Bill, BillItem } from '../../types';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import DeveloperBadge from '../DeveloperBadge';
import { SupabaseUserService as UserManagementService, RestaurantUser } from '../../lib/services/users/supabase';
import { saveToLocalStorage, getFromLocalStorage } from '../../utils/helpers';
// Chart imports removed - now using reusable RevenueChart component
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import CircularProgress from '@mui/material/CircularProgress';
import Papa from 'papaparse';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';

// Staff type definition
interface StaffType {
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


const drawerWidth = 240;

const OwnerDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [staffList, setStaffList] = useState<StaffType[]>([]);
  
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
  const [restaurantType, setRestaurantType] = useState<'Veg' | 'Non-Veg'>('Non-Veg');
  
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
    topSellingItems: [] as Array<{ id: string; quantity: number; revenue: number; name: string }>,
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


  // User Management State
  const [restaurantUsers, setRestaurantUsers] = useState<RestaurantUser[]>([]);


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
    const storedStaffList = getFromLocalStorage('owner_staffList');
    const storedRestaurantUsers = getFromLocalStorage('owner_restaurantUsers');
    if (storedMenuItems) setMenuItems(storedMenuItems);
    if (storedBills) setBills(storedBills);
    if (storedExpenses) setExpenses(storedExpenses);
    if (storedStaffList) setStaffList(storedStaffList);
    if (storedRestaurantUsers) setRestaurantUsers(storedRestaurantUsers);
  }, []);

  // Fetch data when restaurantId becomes available
  useEffect(() => {
    if (restaurantId) {
      fetchCategories();
      fetchMenuItems();
      fetchBills();
      fetchExpenses();
      fetchStaffList();
      fetchRestaurantUsers();
      // Load restaurantType from profile
      (async () => {
        try {
          const snap = await getDoc(doc(db, 'restaurantProfile', restaurantId));
          const rt = snap.data()?.restaurantType as 'Veg' | 'Non-Veg' | undefined;
          if (rt) setRestaurantType(rt);
        } catch (e) {
          console.error('Failed to load restaurantType', e);
        }
      })();
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
    saveToLocalStorage('owner_staffList', staffList);
  }, [staffList]);
  useEffect(() => {
    saveToLocalStorage('owner_restaurantUsers', restaurantUsers);
  }, [restaurantUsers]);

  useEffect(() => {
    calculateAnalytics();
  }, [bills, expenses, staffList, dateFilter, customDate]);

  // Listen for staff updates from StaffManagement (same-tab communication)
  useEffect(() => {
    const handler = (e: any) => {
      const updated = e?.detail;
      if (Array.isArray(updated) && updated.length >= staffList.length) {
        setStaffList(updated as any);
        // calculateAnalytics will re-run due to dependency
      }
    };
    window.addEventListener('staffListUpdated', handler as any);
    return () => window.removeEventListener('staffListUpdated', handler as any);
  }, [staffList.length]);

  // Fetch users when User Management section is opened
  useEffect(() => {
    if (activeSection === 'users' && restaurantId) {
      fetchRestaurantUsers();
    }
  }, [activeSection, restaurantId]);


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

  const fetchStaffList = async () => {
    if (!restaurantId) return;
    try {
      const querySnapshot = await getDocs(collection(db, 'restaurantProfile', restaurantId, 'staff'));
      const staffArr: StaffType[] = [];
      querySnapshot.forEach((doc) => {
        staffArr.push({ id: doc.id, ...doc.data() } as StaffType);
      });
      console.log('Fetched staff:', staffArr);
      setStaffList(staffArr);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };
    // Add state for custom day/month/year selection
  const [customDay, setCustomDay] = useState<number | undefined>(undefined);
  const [customMonth, setCustomMonth] = useState<number | undefined>(undefined);
  const [customYear, setCustomYear] = useState<number>(new Date().getFullYear());



  const calculateAnalytics = useCallback(() => {
    const { start, end, label } = getDateRange(dateFilter, {
      customDate,
      customDay,
      customMonth,
      customYear,
      customDateRange
    });
    
    // Set date range for display
    setDateRange({
      start: start.toLocaleDateString(),
      end: end.toLocaleDateString()
    });
    
    // Use the freshest staff list (prefer localStorage updated by StaffManagement if newer)
    const localStaffList = getFromLocalStorage('owner_staffList') || [];
    const mergedStaffList = Array.isArray(localStaffList) && localStaffList.length > 0
      ? (localStaffList.length >= staffList.length ? localStaffList : staffList)
      : staffList;

    const analyticsData = calculateAnalyticsUtil(bills, expenses, mergedStaffList as any, dateFilter, 0, {
      customDate,
      customDay,
      customMonth,
      customYear,
      customDateRange
    });

    setAnalyticsData(analyticsData);
    
    // --- Day-wise revenue for custom month ---
    if (dateFilter === 'custom') {
      const daysInMonth = new Date(customDate.year, customDate.month + 1, 0).getDate();
      const dayWise: { date: string; revenue: number; billsCount: number; avgBillValue: number }[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dayStart = new Date(customDate.year, customDate.month, d, 0, 0, 0, 0);
        const dayEnd = new Date(customDate.year, customDate.month, d, 23, 59, 59, 999);
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
  }, [bills, expenses, dateFilter, customDate, customDay, customMonth, customYear, customDateRange]);

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
    { id: 'subscription', label: 'Subscription', icon: <AutorenewIcon /> },
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


  // User Management Functions
  const fetchRestaurantUsers = async () => {
    try {
      if (!currentUser?.restaurantId) return;
      const users = await UserManagementService.getRestaurantUsers(currentUser.restaurantId);
      setRestaurantUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch restaurant users');
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
        const safeDay = customDay ?? today.getDate();
        const safeMonth = customMonth ?? today.getMonth();
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



  // In the OwnerDashboard component, find the Payment History Dialog (Dialog open={showHistoryDialog} ...)
  // Add state for selected month/year for summary
  const [summaryMonth, setSummaryMonth] = useState<number | null>(null);
  const [summaryYear, setSummaryYear] = useState<number | null>(null);


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
          example.forEach((row: any) => {
              csv += row.map((field: any) => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
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
    <SubscriptionGate>
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
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <span style={{ fontSize: 32, marginRight: 8 }}>🍽️</span>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                {profile.name || 'SURA-RESTO by SURA'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {profile.address || 'Owner Dashboard'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
            <DeveloperBadge />
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
              {/* REFACTORED: Filter Controls - Consider extracting to DateFilter component for reusability */}
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
                <DateRangeBanner
                  label={getDateRange(dateFilter).label}
                  onDownloadClick={handleDownloadRevenueText}
                />
              </Box>

              {/* Analytics Cards - Using reusable RevenueDashboard component */}
              <RevenueDashboard analyticsData={analyticsData} dateFilter={dateFilter} />

              {/* REFACTORED: Charts and Top Selling Items - Now using reusable components */}
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
                {/* REFACTORED: Revenue Trend Chart - Replaced inline chart with reusable RevenueChart component */}
                <RevenueChart 
                  data={getDayWiseData()}
                  title="📊 Revenue & Expense Analysis"
                  type="line"
                  height={350}
                  emptyMessage="No data for selected period"
                  emptySubtitle="Try changing the date filter or add some bills/expenses."
                />

                {/* REFACTORED: Top Selling Items - Replaced inline ranking display with reusable TopSellingItems component */}
                <TopSellingItems items={analyticsData.topSellingItems} />
              </Box>

              {/* REFACTORED: Monthly Revenue vs Expense Bar Chart - Replaced inline chart with reusable RevenueChart component */}
              <Box sx={{ mt: 4 }}>
                <RevenueChart 
                  data={getMonthlyData()}
                  title={`📊 Monthly Revenue vs Expenses (${new Date().getFullYear()})`}
                  type="bar"
                  height={384}
                  emptyMessage="No data for current year"
                  emptySubtitle="Monthly revenue and expense data will appear here as you add bills and expenses."
                />
              </Box>
            </Box>
          )}

          {/* Menu Management Section */}
          {activeSection === 'menu' && (
            <MenuManagement
              menuItems={menuItems}
              paginatedMenuItems={paginatedMenuItems}
              onEdit={handleMenuDialogOpen}
              onDelete={handleDeleteMenuItem}
              menuPage={menuPage}
              setMenuPage={setMenuPage}
              maxMenuPage={maxMenuPage}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              categories={categories}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              onAddNew={() => handleMenuDialogOpen()}
              onImportCsv={() => setCsvDialogOpen(true)}
              onCategories={() => setCategoryDialogOpen(true)}
            />
          )}

          {/* Raw Material Expenses Section */}
          {activeSection === 'expenses' && (
              <ExpenseManagement
              filteredExpensesForDisplay={filteredExpensesForDisplay}
              totalExpensesForDisplay={totalExpensesForDisplay}
              onAddExpense={() => setIsExpenseDialogOpen(true)}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              dateFilterLabel={`Filter synced with Revenue Dashboard • ${getDateRange(dateFilter).label}`}
              restaurantType={restaurantType}
            />
          )}

          {/* Bill History Section */}
          {activeSection === 'bills' && (
              <BillHistory
              paginatedBills={paginatedBills}
              billPage={billPage}
              setBillPage={setBillPage}
              maxBillPage={maxBillPage}
              refreshing={refreshing}
              onRefresh={handleRefresh}
                dateFilterLabel={getDateRange(dateFilter).label}
              billsCount={filteredBills.length}
            />
          )}

          {/* Staff Management Section */}
          {activeSection === 'staff' && (
            <StaffManagement />
          )}

          {/* Subscription Section */}
          {activeSection === 'subscription' && (
            <SubscriptionManagement />
          )}

          {/* User Management Section */}
          {activeSection === 'users' && (
            <UserManagement 
              users={restaurantUsers}
              onRefreshUsers={fetchRestaurantUsers}
            />
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

    <ExpenseDialog
      open={isExpenseDialogOpen}
      onClose={() => setIsExpenseDialogOpen(false)}
      formData={expenseFormData}
      setFormData={setExpenseFormData}
      onSave={handleSaveExpense}
      loading={loading}
      restaurantType={restaurantType}
    />

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
                  value={customDay !== undefined ? String(customDay) : ''}
                  onChange={e => setCustomDay(e.target.value === '' ? undefined : Number(e.target.value))}
                  label="Day"
                >
                  <MenuItem value="">(All Days)</MenuItem>
                  {customMonth !== undefined && customYear && Array.from({ length: new Date(customYear, customMonth + 1, 0).getDate() }, (_, i) => (
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
                    setCustomMonth(value === '' ? undefined : Number(value));
                    setCustomDay(undefined); // Reset day when month changes
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
                  if (customDay && customMonth !== undefined && customYear) {
                    setCustomDate({ month: customMonth, year: customYear });
                    setSelectedDay(customDay);
                    setDateFilter('customDay');
                  } else if (customMonth !== undefined && customYear) {
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
                  {customDay ? `${customDay} ` : ''}{customMonth !== undefined ? new Date(customYear, customMonth, 1).toLocaleDateString('en-GB', { month: 'short' }) + ' ' : ''}{customYear}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {customDay ? 'Day' : customMonth !== undefined ? 'Month' : 'Year'} revenue analysis
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
            <Box>
              <FormControl fullWidth size="small">
                <InputLabel>Restaurant Type</InputLabel>
                <Select
                  label="Restaurant Type"
                  value={restaurantType}
                  onChange={async (e) => {
                    const value = e.target.value as 'Veg' | 'Non-Veg';
                    setRestaurantType(value);
                    try {
                      if (restaurantId) {
                        await updateDoc(doc(db, 'restaurantProfile', restaurantId), { restaurantType: value });
                        setSuccess('Restaurant type updated');
                      }
                    } catch (err) {
                      console.error('Failed to update restaurant type', err);
                      setError('Failed to update restaurant type');
                    }
                  }}
                >
                  <MenuItem value="Veg">🥗 Veg</MenuItem>
                  <MenuItem value="Non-Veg">🍗 Non-Veg (Veg + Non-Veg)</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Veg: Vegetables, Dairy, Spices, Electricity • Non-Veg: All categories (Veg + Non-Veg)
              </Typography>
            </Box>
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
    </SubscriptionGate>
  );
};

export default OwnerDashboard;