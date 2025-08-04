import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  AppBar,
  Toolbar,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  InputAdornment,
  List,
  ListItemText,
  ListItemButton,
  Autocomplete,
  Snackbar,
  Tooltip
} from '@mui/material';
import { 
  Logout, 
  TableRestaurant,
  Print,
  PrintDisabled,
  Add,
  Delete,
  Edit,
  Assessment,
  Receipt,
  Dashboard,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Restaurant,
  History
} from '@mui/icons-material';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc,
  query, 
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { MenuItem as MenuItemType, BillItem, Bill } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, saveToLocalStorage, getFromLocalStorage, generateBillNumber, updateHighestBillNumber } from '../utils/helpers';
import PrintableBill from './PrintableBill';
import { useReactToPrint } from 'react-to-print';
import { getDoc as firestoreGetDoc, doc as firestoreDoc } from 'firebase/firestore';
import { offlineManager } from '../utils/offlineManager';
import { BillNumberSync } from '../utils/billNumberSync';
import OfflineIndicator from './OfflineIndicator';
import PrinterConnectivity from './PrinterConnectivity';
import TableInputDialog from './TableInputDialog';


interface RunningTable {
  tableNumber: string;
  customerType: 'private' | 'loading';
  hallType: 'common' | 'ac';
  items: BillItem[];
  createdAt: Date;
}

interface DailyStats {
  totalBills: number;
  totalRevenue: number;
  mostSoldItem: { name: string; quantity: number };
  leastSoldItem: { name: string; quantity: number };
  dishStats: Array<{ name: string; quantity: number; revenue: number }>;
}

const ManagerDashboard: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [runningTables, setRunningTables] = useState<RunningTable[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    totalBills: 0,
    totalRevenue: 0,
    mostSoldItem: { name: 'N/A', quantity: 0 },
    leastSoldItem: { name: 'N/A', quantity: 0 },
    dishStats: []
  });

  // Current Bill State
  const [currentHallType, setCurrentHallType] = useState<'common' | 'ac'>('common');
  const [selectedTable, setSelectedTable] = useState<RunningTable | null>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  
  // Item Addition
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemType | null>(null);
  const [quantity, setQuantity] = useState('');
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [formResetKey, setFormResetKey] = useState(0);
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [tempPriceValue, setTempPriceValue] = useState('');
  
  // Ref for focusing back to first field after adding item
  const itemNoFieldRef = React.useRef<HTMLInputElement>(null);
  const itemNameFieldRef = React.useRef<HTMLInputElement>(null);
  const quantityFieldRef = React.useRef<HTMLInputElement>(null);

  // Dialog States
  const [tableInputDialog, setTableInputDialog] = useState(false);
  const [billHistoryDialog, setBillHistoryDialog] = useState(false);
  const [statsDialog, setStatsDialog] = useState(false);

  const [viewBillDialog, setViewBillDialog] = useState(false);
  const [selectedBillForView, setSelectedBillForView] = useState<Bill | null>(null);
  const [modifyingBillId, setModifyingBillId] = useState<string | null>(null);

  // Messages
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { currentUser, logout } = useAuth();

  // Offline sync functionality
  const handleOfflineSync = async () => {
    if (!offlineManager.isOnline() || !currentUser?.restaurantId) {
      return;
    }

    setLoading(true);
    try {
      const pendingBills = offlineManager.getPendingBills();
      console.log(`🔄 Syncing ${pendingBills.length} offline bills`);

      for (const offlineBill of pendingBills) {
        try {
          // Convert offline bill to Firebase format
          const billData = {
            billNumber: offlineBill.billNumber,
            items: offlineBill.items,
            customer: offlineBill.customer,
            customerType: offlineBill.customerType,
            hallType: offlineBill.hallType,
            subtotal: offlineBill.subtotal,
            discountAmount: offlineBill.discountAmount,
            finalSubtotal: offlineBill.finalSubtotal,
            taxAmount: offlineBill.taxAmount,
            totalAmount: offlineBill.totalAmount,
            paymentMethods: offlineBill.paymentMethods,
            status: offlineBill.status,
            createdAt: offlineBill.createdAt,
            createdBy: offlineBill.createdBy,
            completedAt: offlineBill.completedAt
          };

          // Save to Firebase
          const docRef = await addDoc(collection(db, 'restaurantProfile', currentUser.restaurantId, 'bills'), billData);
          
          // Remove from offline storage
          offlineManager.deletePendingBill(offlineBill.offlineId);
          
          console.log('✅ Offline bill synced:', offlineBill.offlineId, '→', docRef.id);
        } catch (error) {
          console.error('❌ Failed to sync offline bill:', offlineBill.offlineId, error);
          // Increment sync attempts
          offlineManager.updateBillOffline(offlineBill.offlineId, {
            syncAttempts: offlineBill.syncAttempts + 1
          });
        }
      }

      // Refresh bills from Firebase
      await fetchBills();
      
      const remaining = offlineManager.getPendingDataCount().bills;
      if (remaining === 0) {
        setSuccess('✅ All offline data synced successfully!');
      } else {
        setSuccess(`⚠️  ${pendingBills.length - remaining} bills synced, ${remaining} failed`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setError('Failed to sync offline data');
    } finally {
      setLoading(false);
    }
  };

  const [profile, setProfile] = useState({
    name: '',
    address: '',
    gstin: '',
    phone: '',
    email: ''
  });
  const printRef = React.useRef<HTMLDivElement>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPrintConfirmDialog, setShowPrintConfirmDialog] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(true);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'SURA-RESTO_BILL',
    onAfterPrint: async () => {
      setShowPrintDialog(false);
      setSuccess('Bill printed successfully');
      // Refresh bills after printing to ensure history is current
      await fetchBills();
    },
    onPrintError: () => setError('Failed to print bill')
  });

  function isPrintableBillReady() {
    // Make print button immediately available when bill preview is shown
    return !!selectedBillForView;
  }

  useEffect(() => {
    const storedTables = getFromLocalStorage('runningTables');
    const storedBills = getFromLocalStorage('bills');
    const storedMenuItems = getFromLocalStorage('menuItems');
    if (storedTables) setRunningTables(storedTables);
    if (storedBills) setBills(storedBills);
    if (storedMenuItems) setMenuItems(storedMenuItems);
    
    // Initialize sequential bill numbering
    const initializeBillNumbering = async () => {
      try {
        if (currentUser?.restaurantId) {
          await BillNumberSync.syncFromFirebase(currentUser.restaurantId);
          console.log('✅ Sequential bill numbering initialized');
        }
      } catch (error) {
        console.error('Failed to initialize bill numbering:', error);
      }
    };
    
    initializeBillNumbering();
    fetchMenuItems();
    fetchBills();
  }, []);

  useEffect(() => {
    saveToLocalStorage('runningTables', runningTables);
  }, [runningTables]);

  useEffect(() => {
    saveToLocalStorage('bills', bills);
  }, [bills]);

  useEffect(() => {
    saveToLocalStorage('menuItems', menuItems);
  }, [menuItems]);

  useEffect(() => {
    calculateDailyStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bills]);

  const fetchMenuItems = async () => {
    try {
      if (!currentUser?.restaurantId) {
        setError('Restaurant ID not found');
        return;
      }
      
      // Try to fetch from Firebase first
      if (offlineManager.isOnline()) {
        try {
      const querySnapshot = await getDocs(collection(db, 'restaurantProfile', currentUser.restaurantId, 'menuItems'));
      const items: MenuItemType[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as MenuItemType);
      });
          
          // Cache the items for offline use
          offlineManager.cacheMenuItems(items);
      setMenuItems(items);
          console.log('✅ Menu items fetched from Firebase and cached');
          return;
        } catch (error) {
          console.warn('⚠️  Failed to fetch from Firebase, falling back to cache:', error);
        }
      }
      
      // Fallback to cached items if offline or Firebase fails
      const cachedItems = offlineManager.getCachedMenuItems();
      if (cachedItems.length > 0) {
        setMenuItems(cachedItems);
        console.log('📱 Using cached menu items (offline mode)');
        if (!offlineManager.isOnline()) {
          setError('Working offline - using cached menu items');
          setTimeout(() => setError(''), 3000);
        }
      } else {
        setError('No menu items available offline. Please connect to internet.');
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setError('Failed to fetch menu items');
    }
  };

  const fetchBills = async () => {
    try {
      if (!currentUser?.restaurantId) {
        setError('Restaurant ID not found');
        return;
      }
      
      const querySnapshot = await getDocs(
        query(collection(db, 'restaurantProfile', currentUser.restaurantId, 'bills'), orderBy('createdAt', 'desc'))
      );
      const fetchedBills: Bill[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore Timestamp to JS Date if needed
        let createdAt = data.createdAt;
        if (createdAt && typeof createdAt === 'object' && typeof createdAt.toDate === 'function') {
          createdAt = createdAt.toDate();
        }
        let completedAt = data.completedAt;
        if (completedAt && typeof completedAt === 'object' && typeof completedAt.toDate === 'function') {
          completedAt = completedAt.toDate();
        }
        fetchedBills.push({ id: doc.id, ...data, createdAt, completedAt } as Bill);
      });
      setBills(fetchedBills);
      
      // Update highest bill number from fetched bills
      if (fetchedBills.length > 0) {
        const highestBill = fetchedBills.reduce((max, bill) => {
          const currentNum = typeof bill.billNumber === 'string' ? parseInt(bill.billNumber) || 0 : bill.billNumber;
          const maxNum = typeof max.billNumber === 'string' ? parseInt(max.billNumber) || 0 : max.billNumber;
          return currentNum > maxNum ? bill : max;
        });
        updateHighestBillNumber(highestBill.billNumber);
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  };

  // Function to get current day bills only
  const getCurrentDayBills = () => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);
    
    return bills.filter(bill => {
      let billDate: Date;
      if (bill.createdAt && typeof bill.createdAt === 'object' && 'toDate' in bill.createdAt) {
        billDate = (bill.createdAt as any).toDate();
      } else {
        billDate = new Date(bill.createdAt);
      }
      return billDate >= startOfDay && billDate <= endOfDay;
    });
  };

  const calculateDailyStats = () => {
    const todayBills = getCurrentDayBills();

    const dishQuantities = new Map<string, { quantity: number; revenue: number }>();
    let totalRevenue = 0;

    todayBills.forEach(bill => {
      totalRevenue += bill.totalAmount;
      bill.items.forEach(billItem => {
        const key = billItem.menuItem.name;
        const existing = dishQuantities.get(key) || { quantity: 0, revenue: 0 };
        const price = billItem.customerType === 'private' 
          ? billItem.menuItem.privatePrice 
          : billItem.menuItem.loadingPrice;
        dishQuantities.set(key, {
          quantity: existing.quantity + billItem.quantity,
          revenue: existing.revenue + (price * billItem.quantity)
        });
      });
    });

    const dishStats = Array.from(dishQuantities.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity);

    setDailyStats({
      totalBills: todayBills.length,
      totalRevenue,
      mostSoldItem: dishStats[0] || { name: 'N/A', quantity: 0 },
      leastSoldItem: dishStats[dishStats.length - 1] || { name: 'N/A', quantity: 0 },
      dishStats
    });
  };

  const determineCustomerType = (tableNumber: string): 'private' | 'loading' => {
    return tableNumber.toUpperCase().startsWith('P') ? 'private' : 'loading';
  };

  // Helper function to get correct price based on hall type and customer type
  const getItemPrice = (menuItem: MenuItemType, customerType: 'private' | 'loading', hallType: 'common' | 'ac') => {
    if (hallType === 'ac' && (menuItem as any).acHallPrice) {
      return (menuItem as any).acHallPrice;
    }
    return customerType === 'private' ? menuItem.privatePrice : menuItem.loadingPrice;
  };

  const handleTableNumberSubmit = (tableNumber: string, hallType: 'common' | 'ac') => {
    if (!tableNumber.trim()) {
      setError('Please enter table number');
      return;
    }

    const customerType = determineCustomerType(tableNumber);
    
    // Check if table already exists
    const existingTable = runningTables.find(t => t.tableNumber === tableNumber);
    if (existingTable) {
      setSelectedTable(existingTable);
      setBillItems([...existingTable.items]);
      setCurrentHallType(existingTable.hallType); // Set hall type from existing table
    } else {
      setBillItems([]);
      setSelectedTable({
        tableNumber: tableNumber,
        customerType,
        hallType: hallType,
        items: [],
        createdAt: new Date()
      });
    }
    
    setTableInputDialog(false);
    // Reset item fields
    setSelectedMenuItem(null);
    setQuantity('');
    setCustomPrice(null);
    
    // Focus on item number field after table creation
    setTimeout(() => {
      if (itemNoFieldRef.current) {
        itemNoFieldRef.current.focus();
      }
    }, 100);
  };

  const addItemToBill = () => {
    const qty = parseInt(quantity) || 0;
    if (!selectedMenuItem || qty <= 0) {
      setError('Please select an item and enter valid quantity');
      return;
    }

    // Calculate original price and discount
    const originalPrice = getItemPrice(
      selectedMenuItem, 
      selectedTable?.customerType || 'private', 
      selectedTable?.hallType || 'common'
    );
    const finalPrice = customPrice || originalPrice;
    const discountPerUnit = originalPrice - finalPrice;
    const totalDiscountAmount = discountPerUnit > 0 ? discountPerUnit * qty : 0;

    const newBillItem: BillItem = {
      menuItem: selectedMenuItem,
      quantity: qty,
      customerType: selectedTable?.customerType || 'private',
      notes: '',
      customPrice: customPrice || undefined, // Only set if there's a custom price
      discountAmount: totalDiscountAmount
    };

    // Check if item already exists in bill (with same custom price)
    const existingIndex = billItems.findIndex(
      item => item.menuItem.id === selectedMenuItem.id && 
               item.customPrice === customPrice
    );

    if (existingIndex >= 0) {
      const updated = [...billItems];
      const existingItem = updated[existingIndex];
      
      // Update quantity and recalculate discount
      const newQuantity = existingItem.quantity + qty;
      const newDiscountAmount = discountPerUnit > 0 ? discountPerUnit * newQuantity : 0;
      
      updated[existingIndex] = {
        ...existingItem,
        quantity: newQuantity,
        discountAmount: newDiscountAmount
      };
      setBillItems(updated);
    } else {
      setBillItems([...billItems, newBillItem]);
    }

    // Reset all form fields completely
    setSelectedMenuItem(null);
    setQuantity('');
    setCustomPrice(null);
    setError('');
    
    // Force autocomplete fields to reset by changing their key
    setFormResetKey(prev => prev + 1);
    
    // Show success message with discount info
    const discountMessage = totalDiscountAmount > 0 
      ? ` (Discount: ₹${totalDiscountAmount.toFixed(0)})` 
      : '';
    setSuccess(`${selectedMenuItem.name} added to bill (Qty: ${qty})${discountMessage}`);
    setTimeout(() => setSuccess(''), 2000);
    
    // Focus back to item number field for next item entry
    setTimeout(() => {
      if (itemNoFieldRef.current) {
        itemNoFieldRef.current.focus();
      }
    }, 100);
  };

  const updateItemQuantity = (index: number, newQuantity: number, showMessage: boolean = false) => {
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or negative
      setBillItems(billItems.filter((_, i) => i !== index));
      if (showMessage) {
        setSuccess(`Item removed from bill`);
        setTimeout(() => setSuccess(''), 2000);
      }
    } else {
      const updated = [...billItems];
      const item = updated[index];
      
      // Recalculate discount amount for new quantity
      const originalPrice = getItemPrice(
        item.menuItem, 
        item.customerType, 
        selectedTable?.hallType || 'common'
      );
      const finalPrice = item.customPrice || originalPrice;
      const discountPerUnit = originalPrice - finalPrice;
      
      updated[index] = {
        ...item,
        quantity: newQuantity,
        discountAmount: discountPerUnit > 0 ? discountPerUnit * newQuantity : 0
      };
      setBillItems(updated);
      
      // Show feedback for quantity change only when requested
      if (showMessage) {
        setSuccess(`${item.menuItem.name} quantity updated to ${newQuantity}`);
        setTimeout(() => setSuccess(''), 1500);
      }
    }
  };

  const calculateBillTotal = () => {
    const subtotal = billItems.reduce((total, item) => {
      const price = item.customPrice || getItemPrice(
        item.menuItem, 
        item.customerType, 
        selectedTable?.hallType || 'common'
      );
      return total + (price * item.quantity);
    }, 0);

    const totalDiscount = billItems.reduce((total, item) => {
      return total + (item.discountAmount || 0);
    }, 0);

    return {
      subtotal: subtotal + totalDiscount, // Original subtotal before discount
      discountAmount: totalDiscount,
      finalSubtotal: subtotal, // After discount
      taxAmount: subtotal * 0.18, // 18% GST on discounted amount
      totalAmount: subtotal + (subtotal * 0.18)
    };
  };

  const handleSideTable = React.useCallback(() => {
    if (!selectedTable || billItems.length === 0) {
      setError('No items to save');
      return;
    }

    const updatedTable = {
      ...selectedTable,
      items: billItems
    };

    const existingIndex = runningTables.findIndex(t => t.tableNumber === selectedTable.tableNumber);
    if (existingIndex >= 0) {
      const updated = [...runningTables];
      updated[existingIndex] = updatedTable;
      setRunningTables(updated);
    } else {
      setRunningTables([...runningTables, updatedTable]);
    }

    setSuccess(`Table ${selectedTable.tableNumber} saved to running tables`);
    setTimeout(() => setSuccess(''), 3000);

    // Clear the right side section after saving
    setSelectedTable(null);
    setBillItems([]);
    setSelectedMenuItem(null);
    setQuantity('');
    setCustomPrice(null);
  }, [selectedTable, billItems, runningTables]);



  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle keyboard events if dialog is open
      if (tableInputDialog) {
        return;
      }

      // N key to create new table
      if ((event.key === 'N' || event.key === 'n')) {
        event.preventDefault();
        event.stopPropagation();
        console.log('N key pressed - opening table dialog');
        
        // Electron-specific handling
        if (window.electronAPI) {
          console.log('Running in Electron - using delayed dialog open');
          setTimeout(() => {
            setTableInputDialog(true);
          }, 50);
        } else {
          setTableInputDialog(true);
        }
        return;
      }

      // Delete key to delete current bill
      if (event.key === 'Delete' && selectedTable) {
        event.preventDefault();
        event.stopPropagation();
        if (!selectedTable) {
          setError('No bill to delete');
          return;
        }
        
        console.log('Deleting table:', selectedTable.tableNumber);

        // Remove from running tables if it exists there
        const updatedRunningTables = runningTables.filter(t => t.tableNumber !== selectedTable.tableNumber);
        setRunningTables(updatedRunningTables);

        // Clear the current bill
        setSelectedTable(null);
        setBillItems([]);
        setSelectedMenuItem(null);
        setQuantity('');
        setCustomPrice(null);
        setModifyingBillId(null);
        
        // Reset form fields and force re-render
        setFormResetKey(prev => prev + 1);
        
        // Ensure dialog is closed and reset
        setTableInputDialog(false);
        
        // Force a complete reset after a short delay
        setTimeout(() => {
          console.log('Forcing form reset after deletion');
          setFormResetKey(prev => prev + 1);
        }, 100);

        setSuccess(`Bill for Table ${selectedTable.tableNumber} deleted successfully`);
        setTimeout(() => setSuccess(''), 3000);
        return;
      }

      // ESC key functionality for Side Table
      if (event.key === 'Escape' && selectedTable && billItems.length > 0 && modifyingBillId === null) {
        event.preventDefault();
        event.stopPropagation();
        handleSideTable();
      }
    };

    // Use capture phase for Electron compatibility
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [selectedTable, billItems, modifyingBillId, handleSideTable, tableInputDialog, runningTables]);

  const handlePrintBill = async () => {
    if (!selectedTable || billItems.length === 0) {
      setError('No items to print');
      return;
    }

    // Check printer connectivity first
    let isPrinterConnected = false;
    try {
      if (window.electronAPI?.checkPrinterConnectivity) {
        const connectivity = await window.electronAPI.checkPrinterConnectivity();
        isPrinterConnected = connectivity.isConnected;
      }
    } catch (error) {
      console.error('Failed to check printer connectivity:', error);
    }

    // Store printer connectivity state
    setPrinterConnected(isPrinterConnected);

    // Create preview bill immediately
    const previewBill = createPreviewBill();
    if (!previewBill) {
      setError('Failed to create bill preview');
      return;
    }

    // Set the preview bill and fetch profile
    setSelectedBillForView(previewBill);
    await fetchProfile();
    
    if (!isPrinterConnected) {
      // Show alert for no printer and provide save only option
      setError('⚠️ No printers connected! You can save the bill for later printing.');
    }
    
    // Open print preview dialog
    setShowPrintDialog(true);
  };
  
  // Create preview bill without saving to database
  const createPreviewBill = () => {
    if (!selectedTable || billItems.length === 0 || !currentUser) {
      return null;
    }

    const { subtotal, discountAmount, finalSubtotal, taxAmount, totalAmount } = calculateBillTotal();

    let billNumber: number;
    
    if (modifyingBillId) {
      // If modifying, find the existing bill number
      const existingBill = bills.find(b => b.id === modifyingBillId);
      const existingBillNumber = existingBill?.billNumber;
      if (typeof existingBillNumber === 'number') {
        billNumber = existingBillNumber;
      } else if (typeof existingBillNumber === 'string') {
        const match = existingBillNumber.match(/(\d+)/);
        billNumber = match && match[1] ? parseInt(match[1], 10) : 1;
      } else {
        billNumber = 1;
      }
    } else {
      // Generate preview bill number for new bills
      let maxSerial = 0;
      bills.forEach(bill => {
        if (bill.billNumber) {
          let num = 0;
          if (typeof bill.billNumber === 'number') {
            num = bill.billNumber;
          } else if (typeof bill.billNumber === 'string') {
            const match = bill.billNumber.match(/(\d+)/);
            if (match && match[1]) {
              num = parseInt(match[1], 10);
            }
          }
          if (!isNaN(num) && num > maxSerial) maxSerial = num;
        }
      });
      billNumber = maxSerial + 1;
    }

    const now = new Date();

    return {
      id: modifyingBillId || 'preview', // Use existing ID if modifying
      billNumber: billNumber,
      items: billItems.map(item => ({
        menuItem: {
          id: item.menuItem.id,
          itemNo: item.menuItem.itemNo,
          name: item.menuItem.name,
          privatePrice: item.menuItem.privatePrice,
          loadingPrice: item.menuItem.loadingPrice,
          category: item.menuItem.category || '',
          isAvailable: item.menuItem.isAvailable || true
        },
        quantity: item.quantity,
        customerType: item.customerType,
        notes: item.notes || '',
        customPrice: item.customPrice || null,
        discountAmount: item.discountAmount || 0
      })),
      customer: {
        name: '',
        phone: '',
        email: '',
        tableNumber: selectedTable.tableNumber
      },
      customerType: selectedTable.customerType,
      hallType: selectedTable.hallType,
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: Number((discountAmount || 0).toFixed(2)),
      finalSubtotal: Number(finalSubtotal.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      paymentMethods: [{ type: 'cash', amount: Number(totalAmount.toFixed(2)) }],
      status: 'paid',
      createdAt: now,
      createdBy: currentUser.uid,
      completedAt: now
    } as Bill;
  };

  // End key functionality for Print
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'End' && billItems.length > 0 && !loading) {
        event.preventDefault();
        handlePrintBill();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [billItems, loading, handlePrintBill]);

  const confirmPrintBill = async () => {
    if (!selectedTable || billItems.length === 0) {
      setError('No items to print');
      return null;
    }

    if (!currentUser) {
      setError('User not authenticated');
      return null;
    }

    setLoading(true);
    try {
      const { subtotal, discountAmount, finalSubtotal, taxAmount, totalAmount } = calculateBillTotal();

      if (modifyingBillId) {
        // Update existing bill
        const billRef = firestoreDoc(db, 'restaurantProfile', currentUser.restaurantId, 'bills', modifyingBillId);
        // Clean billItems to avoid undefined fields
        const cleanedBillItems = billItems.map(item => ({
          ...item,
          customPrice: item.customPrice ?? null,
          notes: item.notes ?? '',
          discountAmount: item.discountAmount ?? 0
        }));
        const updateData = {
          items: cleanedBillItems,
          subtotal: subtotal ?? 0,
          discountAmount: discountAmount ?? 0,
          finalSubtotal: finalSubtotal ?? 0,
          taxAmount: taxAmount ?? 0,
          totalAmount: totalAmount ?? 0,
          paymentMethods: [{ type: 'cash', amount: totalAmount ?? 0 }],
          completedAt: new Date()
        };
        await updateDoc(billRef, updateData);
        setSuccess(`Bill ${modifyingBillId} updated successfully!`);
        
        // Update local bills state immediately for instant feedback
        setBills(prevBills => 
          prevBills.map(bill => 
            bill.id === modifyingBillId 
              ? { 
                  ...bill, 
                  items: updateData.items,
                  subtotal: updateData.subtotal,
                  discountAmount: updateData.discountAmount,
                  finalSubtotal: updateData.finalSubtotal,
                  taxAmount: updateData.taxAmount,
                  totalAmount: updateData.totalAmount,
                  paymentMethods: updateData.paymentMethods,
                  completedAt: updateData.completedAt
                } as Bill
              : bill
          )
        );
        
        // Also refresh bills from database to ensure consistency
        await fetchBills();
        
        // Fetch updated bill
        const updatedBillSnap = await firestoreGetDoc(billRef);
        if (updatedBillSnap.exists()) {
          const billData = updatedBillSnap.data();
          // Ensure proper date conversion
          let createdAt = billData.createdAt;
          if (createdAt && typeof createdAt === 'object' && typeof createdAt.toDate === 'function') {
            createdAt = createdAt.toDate();
          }
          let completedAt = billData.completedAt;
          if (completedAt && typeof completedAt === 'object' && typeof completedAt.toDate === 'function') {
            completedAt = completedAt.toDate();
          }
          
          const updatedBill = { 
            id: billRef.id, 
            ...billData,
            createdAt,
            completedAt
          } as Bill;
          return updatedBill;
        }
        return null;
      } 

      // Generate sequential bill number (works online and offline)
      const sequentialBillNumber = await generateBillNumber(currentUser.restaurantId);

      // Always use current date for createdAt
      const now = new Date();

      // Create new bill - ensure all data is serializable
      const newBill = {
        billNumber: sequentialBillNumber,
        items: billItems.map(item => ({
          menuItem: {
            id: item.menuItem.id,
            itemNo: item.menuItem.itemNo,
            name: item.menuItem.name,
            privatePrice: item.menuItem.privatePrice,
            loadingPrice: item.menuItem.loadingPrice,
            category: item.menuItem.category || '',
            isAvailable: item.menuItem.isAvailable || true
          },
          quantity: item.quantity,
          customerType: item.customerType,
          notes: item.notes || '',
          customPrice: item.customPrice || null,
          discountAmount: item.discountAmount || 0
        })),
        customer: {
          name: '',
          phone: '',
          email: '',
          tableNumber: selectedTable.tableNumber
        },
        customerType: selectedTable.customerType,
        hallType: selectedTable.hallType,
        subtotal: Number(subtotal.toFixed(2)),
        discountAmount: Number((discountAmount || 0).toFixed(2)),
        finalSubtotal: Number(finalSubtotal.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        paymentMethods: [{ type: 'cash', amount: Number(totalAmount.toFixed(2)) }],
        status: 'paid',
        createdAt: now,
        createdBy: currentUser.uid,
        completedAt: now
      };

      // Try to save to Firebase first, fallback to offline storage
      let savedBill: Bill;
      
      if (offlineManager.isOnline()) {
        try {
          // Save to Firebase
      const docRef = await addDoc(collection(db, 'restaurantProfile', currentUser.restaurantId, 'bills'), newBill);
          savedBill = { id: docRef.id, ...newBill } as Bill;
          setSuccess('✅ Bill created and synced to cloud!');
          console.log('✅ Bill saved to Firebase:', savedBill.id);
        } catch (error) {
          console.warn('⚠️  Failed to save to Firebase, saving offline:', error);
          // Save offline if Firebase fails
          const offlineBill = await offlineManager.saveBillOffline(newBill as any, currentUser.restaurantId);
          savedBill = { id: `offline_${offlineBill.offlineId}`, ...newBill } as Bill;
          setSuccess('📱 Bill saved offline - will sync when online');
        }
      } else {
        // Save offline when no internet
        const offlineBill = await offlineManager.saveBillOffline(newBill as any, currentUser.restaurantId);
        savedBill = { id: `offline_${offlineBill.offlineId}`, ...newBill } as Bill;
        setSuccess('📱 Bill saved offline - will sync when connection returns');
        console.log('📱 Bill saved offline:', offlineBill.offlineId);
      }

      // Remove table from running tables
      setRunningTables(runningTables.filter(t => t.tableNumber !== selectedTable.tableNumber));
      
      // Refresh bills (this will include offline bills now)
      await fetchBills();
      
      return savedBill;
    } catch (error) {
      console.error('Error saving bill:', error);
      setError('Failed to save bill');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const selectRunningTable = (table: RunningTable) => {
    setSelectedTable(table);
    setBillItems([...table.items]);
    setModifyingBillId(null); // Reset modify state when selecting running table
  };

  const viewBillDetails = (bill: Bill) => {
    setSelectedBillForView(bill);
    setViewBillDialog(true);
  };

  const openBillForModification = (bill: Bill) => {
    // Set the bill items and table info for modification
    setBillItems([...bill.items]);
    setSelectedTable({
      tableNumber: bill.customer?.tableNumber || `MODIFY-${bill.billNumber}`,
      customerType: bill.customerType,
      hallType: (bill as any).hallType || 'common',
      items: bill.items,
      createdAt: bill.createdAt instanceof Date ? bill.createdAt : new Date(bill.createdAt)
    });
    
    // Track which bill is being modified
    setModifyingBillId(bill.id);
    
    // Close the bill history dialog
    setBillHistoryDialog(false);
    
    setSuccess(`Modifying bill ${bill.billNumber}. Add/remove items and print to update.`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const todayBills = bills.filter(bill => {
    let billDate: Date;
    if (bill.createdAt && typeof bill.createdAt === 'object' && 'toDate' in bill.createdAt) {
      billDate = (bill.createdAt as any).toDate();
    } else {
      billDate = new Date(bill.createdAt);
    }
    const today = new Date();
    return billDate.toDateString() === today.toDateString();
  });

  // Fetch profile for printing
  const fetchProfile = async () => {
    try {
      if (!currentUser?.restaurantId) {
        setProfile({ name: '', address: '', gstin: '', phone: '', email: '' });
        return;
      }
      
      const docRef = firestoreDoc(db, 'restaurantProfile', currentUser.restaurantId);
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
      } else {
        setProfile({ name: '', address: '', gstin: '', phone: '', email: '' });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfile({ name: '', address: '', gstin: '', phone: '', email: '' });
    }
  };

  // Open print dialog and fetch profile
  const handleOpenPrintDialog = async () => {
    await fetchProfile();
    setShowPrintDialog(true);
  };

  // Handle print confirmation - save bill and print
  const handleConfirmPrint = async () => {
    if (isPrinting) return;
    
    setIsPrinting(true);
    setShowPrintConfirmDialog(false);
    
    try {
      // Save the bill first
      const savedBill = await confirmPrintBill();
      if (!savedBill) {
        setError('Failed to save bill');
        return;
      }
      
      // Set up for printing
      setSelectedBillForView(savedBill);
      await fetchProfile();
      
      // Clear the billing interface
      setBillItems([]);
      setSelectedTable(null);
      setModifyingBillId(null);
      
      // Refresh bills to ensure history is updated
      await fetchBills();
      
      // Small delay then open print dialog
      setTimeout(() => {
        setShowPrintDialog(true);
      }, 100);
      
    } catch (error) {
      setError('Failed to save and print bill');
    } finally {
      setIsPrinting(false);
    }
  };

  // Handle cancel - save bill but don't print
  const handleCancelPrint = async () => {
    if (isPrinting) return;
    
    setIsPrinting(true);
    setShowPrintConfirmDialog(false);
    
    try {
      // Save the bill without printing
      const savedBill = await confirmPrintBill();
      if (!savedBill) {
        setError('Failed to save bill');
        return;
      }
      
      setSuccess('Bill saved successfully!');
      
      // Clear the billing interface
      setBillItems([]);
      setSelectedTable(null);
      setModifyingBillId(null);
      
      // Refresh bills to ensure history is updated
      await fetchBills();
      
    } catch (error) {
      setError('Failed to save bill');
    } finally {
      setIsPrinting(false);
    }
  };

  // Add a new handler for print in the preview dialog
  const handlePrintFromPreview = async () => {
    if (isPrinting) return; // Prevent duplicate prints
    
    setIsPrinting(true);
    try {
      // First save the bill to database
      const savedBill = await confirmPrintBill();
      if (!savedBill) {
        setError('Failed to save bill');
        return;
      }
      
      // Update the preview with the saved bill
      setSelectedBillForView(savedBill);
      
      // Small delay to ensure the bill is updated in the preview
      setTimeout(() => {
        // Print the bill
        handlePrint();
        
        // Clear the billing interface after successful print
        setBillItems([]);
        setSelectedTable(null);
        setModifyingBillId(null);
        
        // Close the print dialog after printing
        setTimeout(() => {
          setShowPrintDialog(false);
          setSuccess('Bill printed successfully!');
        }, 1000);
      }, 100);
      
    } catch (error) {
      setError('Failed to print bill');
    } finally {
      setIsPrinting(false);
    }
  };

  // Handle save only (when no printers connected)
  const handleSaveOnly = async () => {
    if (isPrinting) return;
    
    setIsPrinting(true);
    try {
      // Save the bill to database without printing
      const savedBill = await confirmPrintBill();
      if (!savedBill) {
        setError('Failed to save bill');
        return;
      }
      
      setSuccess('Bill saved successfully! You can print it later from the bill history.');
      
      // Clear the billing interface
      setBillItems([]);
      setSelectedTable(null);
      setModifyingBillId(null);
      
      // Close the print dialog
      setShowPrintDialog(false);
      setError(''); // Clear the printer error
      setPrinterConnected(true); // Reset printer state
      
      // Refresh bills to ensure history is updated
      await fetchBills();
      
    } catch (error) {
      setError('Failed to save bill');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AppBar 
        position="sticky" 
        elevation={0}
        className="bg-[#7B2CBF] text-white rounded-b-xl shadow-md"
        sx={{ 
          backgroundColor: '#7B2CBF !important',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
      >
        <Toolbar className="p-4 flex justify-between items-center" sx={{ fontFamily: 'Poppins, sans-serif' }}>
          <Box className="flex items-center flex-grow">
            <span className="text-3xl mr-3">🍽️</span>
            <Typography 
              variant="h6" 
              component="div"
              className="text-lg font-medium"
              sx={{ 
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 500,
                fontSize: '1.125rem'
              }}
            >
              SURA-RESTO by SURA - Manager Panel
            </Typography>
          </Box>
          
          <Box className="flex items-center gap-3">
            {/* Printer Connectivity Indicator */}
            <PrinterConnectivity />
            
            {/* Offline Status Indicator */}
            <OfflineIndicator onSyncClick={handleOfflineSync} />
            
            <Typography 
              variant="body2" 
              className="text-white opacity-90 text-sm font-medium"
              sx={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {currentUser?.email}
            </Typography>
            <Tooltip title="Logout" arrow>
              <IconButton 
                color="inherit" 
                onClick={logout}
                className="text-white hover:bg-white hover:bg-opacity-20 transition-all duration-200"
                sx={{ 
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <Logout />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 1, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, flex: 1 }}>
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

        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <Button
            variant="contained"
            onClick={() => setTableInputDialog(true)}
            startIcon={<TableRestaurant />}
            size="small"
          >
            New Table
          </Button>
          <Button
            variant="outlined"
            onClick={() => setBillHistoryDialog(true)}
            startIcon={<Receipt />}
            size="small"
          >
            History ({todayBills.length})
          </Button>
          <Button
            variant="outlined"
            onClick={() => setStatsDialog(true)}
            startIcon={<Assessment />}
            size="small"
          >
            Stats
          </Button>

        </Box>

        <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0, height: '100%' }}>
          {/* Left Side - Enhanced Sidebar */}
          <Box className="bg-[#7B2CBF] text-white p-4 rounded-xl shadow-sm w-64 h-full flex flex-col" sx={{ minHeight: 0 }}>
            {/* Tables Header */}
            <Typography className="text-sm font-medium mb-2 uppercase tracking-wide">
              Tables ({runningTables.length})
            </Typography>
            
            {/* Tables List */}
            <Box className="space-y-2 flex-1 overflow-auto">
              {runningTables.map((table, index) => (
                <Box
                  key={`table-${table.tableNumber}-${index}`}
                  onClick={(e) => {
                    e.preventDefault();
                    selectRunningTable(table);
                  }}
                  className={`cursor-pointer transition ${
                    selectedTable?.tableNumber === table.tableNumber 
                      ? 'bg-[#B794F4] text-white rounded-full px-4 py-2 text-sm' 
                      : 'bg-white text-[#7B2CBF] rounded-full px-4 py-2 text-sm hover:bg-[#B794F4] hover:text-white transition'
                  }`}
                >
                  <Box className="flex items-center justify-between">
                    <Typography variant="body2" className="font-medium">
                      Table {table.tableNumber}
                    </Typography>
                    <Box className="flex items-center gap-1">
                      <Typography variant="caption" className="opacity-75">
                        {table.customerType[0].toUpperCase()}
                      </Typography>
                      <Typography variant="caption" className="opacity-75">
                        • {table.items.length}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
            
            {/* Footer */}
            <Typography className="text-xs text-white opacity-60 mt-auto text-center pb-2">
              Powered by SURA
            </Typography>
          </Box>

          {/* Right Side - Billing Interface */}
          <Paper sx={{ flex: 1, p: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', minHeight: 0, position: 'relative' }}>
            {/* Background Brand Pattern */}
            <Box className="absolute top-10 right-10 text-[120px] opacity-5 pointer-events-none select-none">
              🍽️
            </Box>
            
            {selectedTable ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, py: 1 }}>
                  <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                      Table {selectedTable.tableNumber}
                    <Chip 
                      label={selectedTable.customerType[0].toUpperCase()} 
                      color={selectedTable.customerType === 'private' ? 'primary' : 'warning'}
                      size="small"
                      sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                    />
                    <Chip 
                      label={selectedTable.hallType === 'ac' ? '❄️ AC' : '🏠 Common'} 
                      color={selectedTable.hallType === 'ac' ? 'info' : 'default'}
                      size="small"
                      sx={{ ml: 0.5, height: 20, fontSize: '0.7rem' }}
                    />
                    {modifyingBillId && (
                      <Chip 
                        label="MODIFY" 
                        color="warning"
                        variant="outlined"
                        size="small"
                        sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                  <Box>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => {
                        if (!selectedTable) {
                          setError('No bill to delete');
                          return;
                        }

                        // Remove from running tables if it exists there
                        const updatedRunningTables = runningTables.filter(t => t.tableNumber !== selectedTable.tableNumber);
                        setRunningTables(updatedRunningTables);

                        // Clear the current bill
                        setSelectedTable(null);
                        setBillItems([]);
                        setSelectedMenuItem(null);
                        setQuantity('');
                        setCustomPrice(null);
                        setModifyingBillId(null);

                        setSuccess(`Bill for Table ${selectedTable.tableNumber} deleted successfully`);
                        setTimeout(() => setSuccess(''), 3000);
                      }}
                      disabled={!selectedTable || loading}
                      size="small"
                      title="Delete bill (Press Delete)"
                      sx={{
                        mr: 1,
                        background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
                        },
                        '&:disabled': {
                          background: '#f5f5f5',
                          color: '#bdbdbd'
                        }
                      }}
                    >
                      <Delete />
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSideTable}
                      disabled={billItems.length === 0 || modifyingBillId !== null}
                      size="small"
                      title="Save current bill to running tables (Press ESC)"
                      sx={{
                        mr: 1,
                        background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                        color: 'white',
                        fontWeight: 600,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
                        },
                        '&:disabled': {
                          background: '#f5f5f5',
                          color: '#bdbdbd',
                          transform: 'none',
                          boxShadow: 'none'
                        }
                      }}
                    >
                      <TableRestaurant sx={{ mr: 1, fontSize: 18 }} />
                      Side Table
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handlePrintBill}
                      disabled={billItems.length === 0 || loading}
                      size="small"
                      title="Print bill (Press End)"
                      sx={{
                        background: 'linear-gradient(135deg, #7B2CBF 0%, #9C27B0 100%)',
                        color: 'white',
                        fontWeight: 600,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 4px 12px rgba(123, 44, 191, 0.3)'
                        },
                        '&:disabled': {
                          background: '#f5f5f5',
                          color: '#bdbdbd',
                          transform: 'none',
                          boxShadow: 'none'
                        }
                      }}
                    >
                      <Print sx={{ mr: 1, fontSize: 18 }} />
                      {loading ? 'Processing...' : modifyingBillId ? 'Update' : 'Print'}
                    </Button>
                    </Box>
                    {selectedTable && billItems.length > 0 && modifyingBillId === null && (
                      <Typography variant="caption" color="primary.main" sx={{ fontSize: '0.65rem', fontWeight: 'medium' }}>
                        Press ESC to side table
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Item Addition Form */}
                <Paper sx={{ p: 1, mb: 1, bgcolor: 'grey.50' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Add Items</Typography>
                    <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'medium' }}>
                      💡 Press Enter to add quickly
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr', gap: 1, alignItems: 'end' }}>
                    {/* Item Number Field */}
                    <Autocomplete
                      options={menuItems}
                      getOptionLabel={(option) => option.itemNo}
                      value={selectedMenuItem}
                      onChange={(_, newValue) => {
                        setSelectedMenuItem(newValue);
                        setCustomPrice(null);
                        if (quantityFieldRef.current) {
                          quantityFieldRef.current.focus();
                        }
                      }}
                      filterOptions={(options, { inputValue }) => {
                        if (!inputValue) return options;
                        const searchValue = inputValue.toLowerCase().trim();
                        return options.filter(option => 
                          option.itemNo.toLowerCase().includes(searchValue)
                        );
                      }}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          label="Item No." 
                          placeholder="e.g., 8-1"
                          variant="outlined"
                          inputRef={itemNoFieldRef}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && selectedMenuItem) {
                              e.preventDefault();
                              if (quantityFieldRef.current) {
                                quantityFieldRef.current.focus();
                              }
                            }
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              height: '40px',
                              '& input': {
                                padding: '8.5px 14px',
                              },
                              '&:hover fieldset': {
                                borderColor: '#E0E0E0',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#E0E0E0',
                                boxShadow: 'none',
                              },
                            },
                            '& .MuiInputBase-input': {
                              outline: 'none',
                              boxShadow: 'none',
                              '&:focus': {
                                outline: 'none',
                                boxShadow: 'none',
                              }
                            },
                            '& .MuiInputLabel-root': {
                              transform: 'translate(14px, 12px) scale(1)',
                              '&.MuiInputLabel-shrink': {
                                transform: 'translate(14px, -6px) scale(0.75)',
                              }
                            }
                          }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props} key={option.id}>
                            <Typography variant="body1">
                            <strong>{option.itemNo}</strong>
                            </Typography>
                        </Box>
                      )}
                      noOptionsText="No items found"
                      isOptionEqualToValue={(option, value) => option?.id === value?.id}
                      autoHighlight
                      clearOnBlur={true}
                      clearOnEscape={true}
                      blurOnSelect={true}
                      key={`item-no-${formResetKey}`}
                    />

                    {/* Item Name Field */}
                    <Autocomplete
                      options={menuItems}
                      getOptionLabel={(option) => option.name}
                      value={selectedMenuItem}
                      onChange={(_, newValue) => {
                        setSelectedMenuItem(newValue);
                        setCustomPrice(null);
                        if (quantityFieldRef.current) {
                          quantityFieldRef.current.focus();
                        }
                      }}
                      filterOptions={(options, { inputValue }) => {
                        if (!inputValue) return options;
                        const searchValue = inputValue.toLowerCase().trim();
                        return options.filter(option => 
                          option.name.toLowerCase().includes(searchValue)
                        );
                      }}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          label="Item Name" 
                          placeholder="e.g., PANEER ANGARA"
                          variant="outlined"
                          inputRef={itemNameFieldRef}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && selectedMenuItem) {
                              e.preventDefault();
                              if (quantityFieldRef.current) {
                                quantityFieldRef.current.focus();
                              }
                            }
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              height: '40px',
                              '& input': {
                                padding: '8.5px 14px',
                              },
                              '&:hover fieldset': {
                                borderColor: '#E0E0E0',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#E0E0E0',
                                boxShadow: 'none',
                              },
                            },
                            '& .MuiInputBase-input': {
                              outline: 'none',
                              boxShadow: 'none',
                              '&:focus': {
                                outline: 'none',
                                boxShadow: 'none',
                              }
                            },
                            '& .MuiInputLabel-root': {
                              transform: 'translate(14px, 12px) scale(1)',
                              '&.MuiInputLabel-shrink': {
                                transform: 'translate(14px, -6px) scale(0.75)',
                              }
                            }
                          }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props} key={option.id}>
                          <Box>
                            <Typography variant="body1">{option.name}</Typography>
                            <Typography variant="body2" color="textSecondary">
                              No: {option.itemNo} | ₹{getItemPrice(option, selectedTable?.customerType || 'private', selectedTable?.hallType || 'common')}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      noOptionsText="No items found"
                      isOptionEqualToValue={(option, value) => option?.id === value?.id}
                      autoHighlight
                      clearOnBlur={true}
                      clearOnEscape={true}
                      blurOnSelect={true}
                      key={`item-name-${formResetKey}`}
                    />
                    
                    {/* Quantity Field */}
                    <TextField
                      label="Quantity"
                      type="number"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(e.target.value);
                      }}
                      inputRef={quantityFieldRef}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && selectedMenuItem && quantity) {
                          e.preventDefault();
                          addItemToBill();
                        }
                      }}
                      placeholder="Enter quantity"
                      variant="outlined"
                      inputProps={{ 
                        min: 1,
                        style: { textAlign: 'center' }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          height: '40px',
                          '& input': {
                            padding: '8.5px 14px',
                          },
                          '&:hover fieldset': {
                            borderColor: '#E0E0E0',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#E0E0E0',
                            boxShadow: 'none',
                          },
                        },
                        '& .MuiInputBase-input': {
                          outline: 'none',
                          boxShadow: 'none',
                          '&:focus': {
                            outline: 'none',
                            boxShadow: 'none',
                          }
                        },
                        '& .MuiInputLabel-root': {
                          transform: 'translate(14px, 12px) scale(1)',
                          '&.MuiInputLabel-shrink': {
                            transform: 'translate(14px, -6px) scale(0.75)',
                          }
                        }
                      }}
                    />
                    
                    {/* Price Field - Read Only */}
                    <TextField
                      label="Price"
                      value={selectedMenuItem ? getItemPrice(selectedMenuItem, selectedTable?.customerType || 'private', selectedTable?.hallType || 'common') : ''}
                      InputProps={{
                        readOnly: true,
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                        style: { textAlign: 'center' }
                      }}
                      variant="outlined"
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          height: '40px',
                          '& input': {
                            padding: '8.5px 0px 8.5px 14px',
                          },
                          '&:hover fieldset': {
                            borderColor: '#E0E0E0',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#E0E0E0',
                            boxShadow: 'none',
                          },
                        },
                        '& .MuiInputBase-input': { 
                          backgroundColor: '#f8f9fa',
                          color: '#666',
                          cursor: 'not-allowed',
                          outline: 'none',
                          boxShadow: 'none',
                          '&:focus': {
                            outline: 'none',
                            boxShadow: 'none',
                          }
                        },
                        '& .MuiInputLabel-root': {
                          transform: 'translate(14px, 12px) scale(1)',
                          '&.MuiInputLabel-shrink': {
                            transform: 'translate(14px, -6px) scale(0.75)',
                          }
                        }
                      }}
                    />
                    
                    {/* Total Field */}
                    <TextField
                      label="Total"
                      value={selectedMenuItem && quantity ? formatCurrency(getItemPrice(selectedMenuItem, selectedTable?.customerType || 'private', selectedTable?.hallType || 'common') * parseInt(quantity)) : '₹0'}
                      InputProps={{
                        readOnly: true,
                        style: { textAlign: 'center', fontWeight: 'bold' }
                      }}
                      variant="outlined"
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          height: '40px',
                          '& input': {
                            padding: '8.5px 14px',
                          },
                          '&:hover fieldset': {
                            borderColor: '#E0E0E0',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#E0E0E0',
                            boxShadow: 'none',
                          },
                        },
                        '& .MuiInputBase-input': { 
                          backgroundColor: '#f5f5f5',
                          fontWeight: 'bold',
                          outline: 'none',
                          boxShadow: 'none',
                          '&:focus': {
                            outline: 'none',
                            boxShadow: 'none',
                          }
                        },
                        '& .MuiInputLabel-root': {
                          transform: 'translate(14px, 12px) scale(1)',
                          '&.MuiInputLabel-shrink': {
                            transform: 'translate(14px, -6px) scale(0.75)',
                          }
                        }
                      }}
                    />
                  </Box>
                  
                  {/* Add Button */}
                  <Box sx={{ mt: 1, textAlign: 'center' }}>
                    <Button
                      variant="contained"
                      onClick={addItemToBill}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addItemToBill();
                        }
                      }}
                      disabled={!selectedMenuItem}
                      startIcon={<Add />}
                      size="small"
                      sx={{ px: 2 }}
                    >
                      ADD ITEM
                    </Button>
                  </Box>
                </Paper>

                {/* Bill Items Table */}
                <Box sx={{ flex: 1, overflow: 'auto', mb: 1 }}>
                  <TableContainer sx={{ maxHeight: '100%' }}>
                    <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>No</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', py: 0.5 }}>Item</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5, color: 'primary.main' }}>
                            Qty ✎
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', py: 0.5, color: 'orange' }}>
                            Price ✎
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', py: 0.5 }}>Total</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', py: 0.5 }}>Del</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {billItems.map((item, index) => {
                          const finalPrice = item.customPrice || getItemPrice(
                            item.menuItem, 
                            item.customerType, 
                            selectedTable?.hallType || 'common'
                          );
                        const total = finalPrice * item.quantity;
                        
                        return (
                            <TableRow key={index} sx={{ '&:nth-of-type(even)': { backgroundColor: '#fafafa' } }}>
                              <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', py: 0.5 }}>
                                {item.menuItem.itemNo}
                              </TableCell>
                              <TableCell sx={{ py: 0.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 'medium', fontSize: '0.8rem' }}>
                              {item.menuItem.name}
                                </Typography>
                            </TableCell>
                              <TableCell align="center" sx={{ py: 0.5 }}>
                              <TextField
                                value={item.quantity}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Only allow numeric input and empty string
                                    if (value === '' || /^\d+$/.test(value)) {
                                      if (value === '') {
                                        // Allow empty field during editing
                                        const updated = [...billItems];
                                        updated[index] = { ...updated[index], quantity: '' as any };
                                        setBillItems(updated);
                                      } else {
                                        const numValue = parseInt(value);
                                        if (numValue > 0) {
                                          updateItemQuantity(index, numValue);
                                        }
                                      }
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // When user leaves the field, ensure it has a valid quantity
                                    const target = e.target as HTMLInputElement;
                                    const value = parseInt(target.value) || 1;
                                    updateItemQuantity(index, value, true);
                                  }}
                                  onKeyDown={(e) => {
                                    // Handle Enter key to save
                                    if (e.key === 'Enter') {
                                      const target = e.target as HTMLInputElement;
                                      const value = parseInt(target.value) || 1;
                                      updateItemQuantity(index, value, true);
                                      target.blur();
                                    }
                                  }}
                                  onFocus={(e) => (e.target as HTMLInputElement).select()}
                                size="small"
                                sx={{ 
                                    width: 60,
                                    '& .MuiInputBase-input': { 
                                      textAlign: 'center', 
                                      fontWeight: 'bold', 
                                      py: 0.3,
                                      cursor: 'pointer',
                                      backgroundColor: '#f8f9ff',
                                      outline: 'none',
                                      boxShadow: 'none',
                                      '&:focus': {
                                        backgroundColor: '#e3f2fd',
                                        outline: 'none',
                                        boxShadow: 'none',
                                      }
                                    },
                                    '& .MuiOutlinedInput-root': {
                                      '&:hover fieldset': {
                                        borderColor: '#E0E0E0',
                                      },
                                      '&.Mui-focused fieldset': {
                                        borderColor: '#E0E0E0',
                                        boxShadow: 'none',
                                      },
                                    }
                                  }}
                                  inputProps={{ 
                                    inputMode: 'numeric',
                                    pattern: '[0-9]*'
                                  }}
                                />
                            </TableCell>
                              <TableCell align="right" sx={{ py: 0.5 }}>
                                <TextField
                                  value={editingPriceIndex === index ? tempPriceValue : finalPrice.toFixed(2)}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow numeric input with decimals and empty string
                                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                      setTempPriceValue(value);
                                    }
                                  }}
                                  onFocus={(e) => {
                                    setEditingPriceIndex(index);
                                    setTempPriceValue('');
                                    // Don't auto-select, let user start fresh
                                  }}
                                  onBlur={(e) => {
                                    // When user leaves the field, save or reset
                                    const value = tempPriceValue.trim();
                                    const updated = [...billItems];
                                    const currentItem = updated[index];
                                    
                                    // Calculate original price for discount calculation
                                    const originalPrice = getItemPrice(
                                      currentItem.menuItem, 
                                      currentItem.customerType, 
                                      selectedTable?.hallType || 'common'
                                    );
                                    
                                    if (value === '') {
                                      // Field was cleared - reset to original price
                                      updated[index] = { 
                                        ...updated[index], 
                                        customPrice: undefined,
                                        discountAmount: 0
                                      };
                                      setSuccess(`Price reset to original for ${item.menuItem.name}`);
                                    } else {
                                      const numValue = parseFloat(value);
                                      if (!isNaN(numValue) && numValue > 0) {
                                        // Valid price entered - calculate discount
                                        const discountPerUnit = originalPrice - numValue;
                                        const totalDiscountAmount = discountPerUnit > 0 ? discountPerUnit * currentItem.quantity : 0;
                                        
                                        updated[index] = { 
                                          ...updated[index], 
                                          customPrice: numValue,
                                          discountAmount: totalDiscountAmount
                                        };
                                        
                                        const discountMessage = totalDiscountAmount > 0 
                                          ? ` (Discount: ₹${totalDiscountAmount.toFixed(0)})` 
                                          : '';
                                        setSuccess(`Price updated for ${item.menuItem.name}${discountMessage}`);
                                      } else {
                                        // Invalid price - reset to original
                                        updated[index] = { 
                                          ...updated[index], 
                                          customPrice: undefined,
                                          discountAmount: 0
                                        };
                                        setSuccess(`Invalid price - reset to original for ${item.menuItem.name}`);
                                      }
                                    }
                                    
                                    setBillItems(updated);
                                    setEditingPriceIndex(null);
                                    setTempPriceValue('');
                                    setTimeout(() => setSuccess(''), 2000);
                                  }}
                                  onKeyDown={(e) => {
                                    // Handle Enter key to save
                                    if (e.key === 'Enter') {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                    // Handle Escape to cancel editing
                                    if (e.key === 'Escape') {
                                      setEditingPriceIndex(null);
                                      setTempPriceValue('');
                                    }
                                  }}
                                  size="small"
                                  sx={{ 
                                    width: 80,
                                    '& .MuiInputBase-input': { 
                                      textAlign: 'right', 
                                      fontWeight: 'medium', 
                                      py: 0.3,
                                      fontSize: '0.8rem',
                                      cursor: 'pointer',
                                      backgroundColor: item.customPrice ? '#fff3e0' : '#f8f9ff',
                                      outline: 'none',
                                      boxShadow: 'none',
                                      '&:focus': {
                                        backgroundColor: '#e3f2fd',
                                        outline: 'none',
                                        boxShadow: 'none',
                                      }
                                    },
                                    '& .MuiOutlinedInput-root': {
                                      '&:hover fieldset': {
                                        borderColor: '#E0E0E0',
                                      },
                                      '&.Mui-focused fieldset': {
                                        borderColor: '#E0E0E0',
                                        boxShadow: 'none',
                                      },
                                    }
                                  }}
                                  inputProps={{ 
                                    inputMode: 'decimal',
                                    step: '0.01'
                                  }}
                                />
                            </TableCell>
                              <TableCell align="right" sx={{ py: 0.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '0.8rem' }}>
                                  {total.toFixed(2)}
                                </Typography>
                            </TableCell>
                              <TableCell align="center" sx={{ py: 0.5 }}>
                              <IconButton
                                color="error"
                                  size="small"
                                  onClick={() => updateItemQuantity(index, 0, true)}
                                  sx={{ p: 0.5 }}
                              >
                                  <Delete fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                </Box>

                {billItems.length > 0 && (
                  <Box sx={{ p: 1, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Qty: <strong>{billItems.reduce((sum, item) => sum + item.quantity, 0)}</strong> | 
                          Disc: <strong>{calculateBillTotal().discountAmount > 0 ? formatCurrency(calculateBillTotal().discountAmount) : '0'}</strong>
                    </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="textSecondary">
                          Subtotal: <strong>{formatCurrency(calculateBillTotal().finalSubtotal)}</strong> | 
                          CGST: <strong>{formatCurrency(calculateBillTotal().taxAmount / 2)}</strong> | 
                          SGST: <strong>{formatCurrency(calculateBillTotal().taxAmount / 2)}</strong>
                      </Typography>
                        <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold' }}>
                          Total: <strong>{formatCurrency(calculateBillTotal().totalAmount)}</strong>
                    </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                minHeight: 0,
                flexGrow: 1,
                position: 'relative',
                p: { xs: 2, sm: 4, md: 6 },
                boxSizing: 'border-box',
                maxWidth: '100%',
                overflowX: 'hidden',
              }}>
                {/* Background Pattern */}
                <Box sx={{ 
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  fontSize: { xs: '4rem', sm: '6rem', md: '8rem' },
                  opacity: 0.05,
                  transform: 'rotate(15deg)'
                }}>
                  🍽️
                </Box>
                
                <Typography sx={{ fontSize: { xs: '2.5rem', sm: '3rem', md: '4rem' }, mb: 2, maxWidth: '100%', overflowWrap: 'break-word', wordBreak: 'break-word' }}>🪑</Typography>
                <Typography variant="h5" sx={{ color: '#6A1B9A', fontWeight: 'bold', mb: 1, fontSize: { xs: '1.3rem', sm: '1.7rem', md: '2rem' }, maxWidth: '100%', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                  Ready to Start Billing
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mb: 3, fontSize: { xs: '0.95rem', sm: '1.05rem' }, maxWidth: '100%', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                  Select an active table from the sidebar or create a new table to begin
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setTableInputDialog(true)}
                  startIcon={<Add />}
                  sx={{
                    background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4A148C 0%, #6A1B9A 100%)'
                    },
                    px: { xs: 2, sm: 4 },
                    py: { xs: 1.5, sm: 2 },
                    borderRadius: 2,
                    boxShadow: '0 8px 25px rgba(106, 27, 154, 0.3)',
                    textTransform: 'none',
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                    maxWidth: '100%',
                    minWidth: 0,
                    flexShrink: 1,
                  }}
                >
                  🆕 Create New Table
                </Button>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

            {/* Table Number Input Dialog */}
      <TableInputDialog
        key={`table-dialog-${formResetKey}`}
        open={tableInputDialog}
        onClose={() => setTableInputDialog(false)}
        onSubmit={handleTableNumberSubmit}
        currentHallType={currentHallType}
      />

      {/* Enhanced Bill History Dialog */}
      <Dialog 
        open={billHistoryDialog} 
        onClose={() => setBillHistoryDialog(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #7B2CBF 0%, #9C27B0 100%)',
          color: 'white',
          textAlign: 'center', 
          fontWeight: 'bold', 
          fontSize: '1.5rem',
          letterSpacing: 1,
          py: 3,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <History sx={{ fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Bill History
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.9, fontWeight: 400 }}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} • {getCurrentDayBills().length} Bills Generated
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {/* Bill History Table */}
          <Box sx={{ p: 3 }}>
            <Card sx={{ 
              background: 'white',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              borderRadius: 2
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Receipt sx={{ color: '#7B2CBF', fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#7B2CBF' }}>
                    Today's Bills ({getCurrentDayBills().length})
                  </Typography>
                  <Chip 
                    label={`${new Date().toLocaleDateString()} • Resets Daily`} 
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ ml: 'auto' }}
                  />
                </Box>
                
                <TableContainer sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <Table size="medium">
                    <TableHead>
                      <TableRow sx={{ background: 'linear-gradient(135deg, #7B2CBF 0%, #9C27B0 100%)' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Bill #</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Time</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Table</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Customer Type</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Hall Type</TableCell>
                        <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Amount</TableCell>
                        <TableCell align="center" sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getCurrentDayBills().map((bill, index) => (
                        <TableRow 
                          key={bill.id}
                          sx={{ 
                            '&:hover': { 
                              background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                              transform: 'scale(1.01)',
                              transition: 'all 0.2s'
                            },
                            '&:nth-of-type(even)': {
                              background: 'rgba(123, 44, 191, 0.02)'
                            }
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip 
                                label={bill.billNumber} 
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {new Date(bill.createdAt).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: true 
                              })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(bill.createdAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <TableRestaurant sx={{ fontSize: 16, color: '#7B2CBF' }} />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {bill.customer?.tableNumber || 'N/A'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={bill.customerType === 'private' ? 'Private' : 'Loading'} 
                              size="small"
                              color={bill.customerType === 'private' ? 'primary' : 'warning'}
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={(bill as any).hallType === 'ac' ? '❄️ AC Hall' : '🏠 Common Hall'} 
                              size="small"
                              color={(bill as any).hallType === 'ac' ? 'info' : 'default'}
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#2e7d32', fontSize: '1.1rem' }}>
                              {formatCurrency(bill.totalAmount)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <Button
                                size="small"
                                onClick={() => viewBillDetails(bill)}
                                startIcon={<Receipt />}
                                variant="contained"
                                sx={{ 
                                  background: 'linear-gradient(135deg, #7B2CBF 0%, #9C27B0 100%)',
                                  color: 'white',
                                  fontWeight: 600,
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
                                    transform: 'translateY(-1px)'
                                  }
                                }}
                              >
                                View
                              </Button>
                              <Button
                                size="small"
                                onClick={() => openBillForModification(bill)}
                                startIcon={<Edit />}
                                variant="outlined"
                                sx={{ 
                                  borderColor: '#7B2CBF',
                                  color: '#7B2CBF',
                                  fontWeight: 600,
                                  '&:hover': {
                                    borderColor: '#9C27B0',
                                    backgroundColor: 'rgba(123, 44, 191, 0.1)',
                                    transform: 'translateY(-1px)'
                                  }
                                }}
                              >
                                Edit
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {getCurrentDayBills().length === 0 && (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 8,
                    background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                    borderRadius: 2,
                    mt: 2
                  }}>
                    <Receipt sx={{ fontSize: 64, color: '#7B2CBF', mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" sx={{ color: '#7B2CBF', mb: 1 }}>
                      No Bills Generated Today
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Bills created today will appear here. Start by creating your first bill!
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 3, 
          background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
          borderTop: '1px solid #dee2e6'
        }}>
          <Button 
            onClick={() => setBillHistoryDialog(false)}
            variant="contained"
            sx={{ 
              background: 'linear-gradient(135deg, #7B2CBF 0%, #9C27B0 100%)',
              color: 'white',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 8px 25px rgba(123, 44, 191, 0.3)'
              }
            }}
          >
            Close History
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Daily Stats Dialog */}
      <Dialog 
        open={statsDialog} 
        onClose={() => setStatsDialog(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #7B2CBF 0%, #9C27B0 100%)',
          color: 'white',
          textAlign: 'center', 
          fontWeight: 'bold', 
          fontSize: '1.5rem',
          letterSpacing: 1,
          py: 3,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Assessment sx={{ fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Today's Performance Dashboard
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.9, fontWeight: 400 }}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {/* Key Metrics Cards */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, 
            gap: 2, 
            p: 3,
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
          }}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': { transform: 'translateY(-2px)', transition: 'transform 0.2s' }
            }}>
              <Box sx={{ 
                position: 'absolute', 
                top: -10, 
                right: -10, 
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                background: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Receipt sx={{ fontSize: 24 }} />
              </Box>
              <CardContent sx={{ pt: 2, pb: 1 }}>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {dailyStats.totalBills}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Bills Today
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': { transform: 'translateY(-2px)', transition: 'transform 0.2s' }
            }}>
              <Box sx={{ 
                position: 'absolute', 
                top: -10, 
                right: -10, 
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                background: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AttachMoney sx={{ fontSize: 24 }} />
              </Box>
              <CardContent sx={{ pt: 2, pb: 1 }}>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {formatCurrency(dailyStats.totalRevenue)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Revenue
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': { transform: 'translateY(-2px)', transition: 'transform 0.2s' }
            }}>
              <Box sx={{ 
                position: 'absolute', 
                top: -10, 
                right: -10, 
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                background: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp sx={{ fontSize: 24 }} />
              </Box>
              <CardContent sx={{ pt: 2, pb: 1 }}>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {dailyStats.mostSoldItem.quantity}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Top Item Sales
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ 
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': { transform: 'translateY(-2px)', transition: 'transform 0.2s' }
            }}>
              <Box sx={{ 
                position: 'absolute', 
                top: -10, 
                right: -10, 
                width: 60, 
                height: 60, 
                borderRadius: '50%', 
                background: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Restaurant sx={{ fontSize: 24 }} />
              </Box>
              <CardContent sx={{ pt: 2, pb: 1 }}>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {dailyStats.dishStats.length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Items Sold
                </Typography>
              </CardContent>
            </Card>
          </Box>

          {/* Performance Highlights */}
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#7B2CBF' }}>
              🏆 Performance Highlights
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 4 }}>
              <Card sx={{ 
                border: '2px solid #4caf50',
                background: 'linear-gradient(135deg, #f8fff8 0%, #e8f5e8 100%)',
                '&:hover': { boxShadow: '0 8px 25px rgba(76, 175, 80, 0.2)' }
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <TrendingUp color="success" />
                    <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                      Most Popular Item
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#2e7d32' }}>
                    {dailyStats.mostSoldItem.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip 
                      label={`${dailyStats.mostSoldItem.quantity} sold`} 
                      color="success" 
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Best performer today
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ 
                border: '2px solid #ff9800',
                background: 'linear-gradient(135deg, #fff8f0 0%, #ffe8cc 100%)',
                '&:hover': { boxShadow: '0 8px 25px rgba(255, 152, 0, 0.2)' }
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <TrendingDown color="warning" />
                    <Typography variant="h6" color="warning.main" sx={{ fontWeight: 600 }}>
                      Needs Attention
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#e65100' }}>
                    {dailyStats.leastSoldItem.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip 
                      label={`${dailyStats.leastSoldItem.quantity} sold`} 
                      color="warning" 
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Consider promotions
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Enhanced Dish Performance Table */}
            <Card sx={{ 
              background: 'white',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              borderRadius: 2
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Restaurant sx={{ color: '#7B2CBF', fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#7B2CBF' }}>
                    Detailed Item Performance
                  </Typography>
                </Box>
                
                <TableContainer sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <Table size="medium">
                    <TableHead>
                      <TableRow sx={{ background: 'linear-gradient(135deg, #7B2CBF 0%, #9C27B0 100%)' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Rank</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Item Name</TableCell>
                        <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Quantity Sold</TableCell>
                        <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Revenue Generated</TableCell>
                        <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Performance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dailyStats.dishStats.map((dish, index) => {
                        const maxQuantity = Math.max(...dailyStats.dishStats.map(d => d.quantity));
                        const performancePercentage = maxQuantity > 0 ? (dish.quantity / maxQuantity) * 100 : 0;
                        
                        return (
                          <TableRow 
                            key={index}
                            sx={{ 
                              '&:hover': { 
                                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                transform: 'scale(1.01)',
                                transition: 'all 0.2s'
                              }
                            }}
                          >
                            <TableCell>
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1 
                              }}>
                                <Chip 
                                  label={index + 1} 
                                  size="small"
                                  color={index === 0 ? 'success' : index === 1 ? 'primary' : index === 2 ? 'warning' : 'default'}
                                  sx={{ 
                                    fontWeight: 600,
                                    minWidth: 32
                                  }}
                                />
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {dish.name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#7B2CBF' }}>
                                {dish.quantity}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                                {formatCurrency(dish.revenue)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                                <Box sx={{ 
                                  width: 60, 
                                  height: 8, 
                                  background: '#e0e0e0', 
                                  borderRadius: 4,
                                  overflow: 'hidden'
                                }}>
                                  <Box sx={{ 
                                    width: `${performancePercentage}%`, 
                                    height: '100%', 
                                    background: index === 0 ? '#4caf50' : index === 1 ? '#2196f3' : index === 2 ? '#ff9800' : '#9e9e9e',
                                    borderRadius: 4
                                  }} />
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  {performancePercentage.toFixed(0)}%
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 3, 
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderTop: '1px solid #dee2e6'
        }}>
          <Button 
            onClick={() => setStatsDialog(false)}
            variant="contained"
            sx={{ 
              background: 'linear-gradient(135deg, #7B2CBF 0%, #9C27B0 100%)',
              color: 'white',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 8px 25px rgba(123, 44, 191, 0.3)'
              }
            }}
          >
            Close Dashboard
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Bill Dialog */}
      <Dialog open={viewBillDialog} onClose={() => setViewBillDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          bgcolor: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)', 
          color: '#8E24AA',
          textAlign: 'center', 
          fontWeight: 'bold', 
          fontSize: '1.4rem',
          letterSpacing: 1,
          py: 2,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          background: 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          userSelect: 'none'
        }}>Bill Details</DialogTitle>
        <DialogContent>
          {selectedBillForView && (
            <Box>
              <Box sx={{ display: 'flex', gap: 4, mb: 3 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography><strong>Bill Number:</strong> {selectedBillForView.billNumber}</Typography>
                  <Typography><strong>Table:</strong> {selectedBillForView.customer?.tableNumber || '-'}</Typography>
                  <Typography><strong>Customer Type:</strong> {selectedBillForView.customerType}</Typography>
                  <Typography><strong>Hall Type:</strong> {(selectedBillForView as any).hallType === 'ac' ? 'AC Hall' : 'Common Hall'}</Typography>
                  <Typography><strong>Date:</strong> {formatDate(selectedBillForView.createdAt)}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography><strong>Status:</strong> {selectedBillForView.status}</Typography>
                  <Typography><strong>Payment Method:</strong> {selectedBillForView.paymentMethods[0]?.type.toUpperCase() || 'N/A'}</Typography>
                  <Typography><strong>Total Amount:</strong> {formatCurrency(selectedBillForView.totalAmount)}</Typography>
                </Box>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Item No</TableCell>
                      <TableCell>Item Name</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Original Price</TableCell>
                      <TableCell align="right">Final Price</TableCell>
                      <TableCell align="right">Discount</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedBillForView.items.map((item, index) => {
                      // Calculate original price based on customer type and hall type
                      const hallType = (selectedBillForView as any).hallType || 'common';
                      let originalPrice: number = 0;
                      
                      if (item.customerType === 'private') {
                        originalPrice = hallType === 'ac' 
                          ? (item.menuItem.acHallPrice || item.menuItem.privatePrice || 0)
                          : (item.menuItem.privatePrice || 0);
                      } else {
                        originalPrice = item.menuItem.loadingPrice || 0;
                      }
                      
                      const finalPrice: number = item.customPrice || originalPrice;
                      const hasDiscount = (item.discountAmount || 0) > 0;
                      const discountPerUnit = hasDiscount ? (item.discountAmount || 0) / item.quantity : 0;
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>{item.menuItem.itemNo}</TableCell>
                          <TableCell>
                            {item.menuItem.name}
                            {hasDiscount && (
                              <Chip 
                                label="Discounted" 
                                size="small" 
                                color="success" 
                                sx={{ ml: 1 }} 
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                textDecoration: hasDiscount ? 'line-through' : 'none',
                                color: hasDiscount ? 'text.secondary' : 'text.primary'
                              }}
                            >
                              ₹{originalPrice}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: hasDiscount ? 'success.main' : 'text.primary',
                                fontWeight: hasDiscount ? 'bold' : 'normal'
                              }}
                            >
                              ₹{finalPrice}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {hasDiscount ? (
                              <Typography variant="body2" color="success.main">
                                ₹{discountPerUnit.toFixed(0)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">₹{(finalPrice * item.quantity).toFixed(0)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Typography>Subtotal: {formatCurrency(selectedBillForView.subtotal)}</Typography>
                {selectedBillForView.discountAmount > 0 && (
                  <Typography color="success.main">
                    Total Discount: -{formatCurrency(selectedBillForView.discountAmount)}
                  </Typography>
                )}
                {selectedBillForView.finalSubtotal && (
                  <Typography>After Discount: {formatCurrency(selectedBillForView.finalSubtotal)}</Typography>
                )}
                <Typography>Tax (18%): {formatCurrency(selectedBillForView.taxAmount)}</Typography>
                <Typography variant="h6">Total: {formatCurrency(selectedBillForView.totalAmount)}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewBillDialog(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={handlePrintFromPreview}
            disabled={!isPrintableBillReady() || isPrinting}
          >
            {isPrinting ? 'Processing...' : 'Print'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bill Print Preview Dialog */}
      <Dialog open={showPrintDialog} onClose={() => setShowPrintDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          Bill Print Preview
          {!printerConnected && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <PrintDisabled color="warning" />
              <Typography variant="body2" color="warning.main" sx={{ fontSize: '0.9rem' }}>
                No printers connected
              </Typography>
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedBillForView ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <PrintableBill ref={printRef} bill={selectedBillForView} profile={profile} />
            </div>
          ) : (
            <Typography color="error" sx={{ textAlign: 'center', mt: 2 }}>
              No bill to print.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={handleSaveOnly}
            disabled={isPrinting}
          >
            {isPrinting ? 'Saving...' : 'Save Only'}
          </Button>
          <Button
            variant="contained"
            onClick={handlePrintFromPreview}
            disabled={!isPrintableBillReady() || isPrinting || !printerConnected}
            startIcon={<Print />}
          >
            {isPrinting ? 'Saving & Printing...' : 'Print Bill'}
          </Button>
          <Button onClick={async () => {
            setShowPrintDialog(false);
            setError(''); // Clear the printer error
            setPrinterConnected(true); // Reset printer state
            await fetchBills();
          }}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Print Confirmation Dialog */}
      <Dialog open={showPrintConfirmDialog} onClose={() => setShowPrintConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {modifyingBillId ? 'Update Bill' : 'Complete Order'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {modifyingBillId 
              ? 'The bill has been updated. Would you like to print the updated bill?'
              : 'Order is ready to be completed. Would you like to print the bill?'
            }
          </Typography>
          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
            <Typography variant="h6" color="primary">
              Total Amount: {formatCurrency(calculateBillTotal().totalAmount)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {billItems.length} items • Table {selectedTable?.tableNumber}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelPrint}
            disabled={isPrinting}
            variant="outlined"
          >
            {isPrinting ? 'Saving...' : 'Save Only'}
          </Button>
          <Button 
            onClick={handleConfirmPrint}
            disabled={isPrinting}
            variant="contained"
            startIcon={<Print />}
          >
            {isPrinting ? 'Processing...' : 'Save & Print'}
          </Button>
        </DialogActions>
      </Dialog>


    </Box>
  );
};

export default ManagerDashboard;