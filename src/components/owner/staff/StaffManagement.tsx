import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
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
  TextField,
  Chip,
  Card,
  Menu,
  MenuItem,
  InputAdornment,
  Snackbar,
  Alert,
  LinearProgress,
  Avatar,
  Divider,
  Tooltip
} from '@mui/material';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import {
  Add,
  Assessment,
  Refresh,
  Search,
  Clear
} from '@mui/icons-material';
import PhoneIcon from '@mui/icons-material/Phone';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HistoryIcon from '@mui/icons-material/History';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import { staffService } from '../../../lib/services/staff/provider';
import { useAuth } from '../../../contexts/SupabaseAuthContext';
import { getStaffTotals, getAmountLeftToPay } from "./staffUtils";
import RefreshButton from "../common/RefreshButton";
import PaginationControls from "../common/PaginationControls";
import PaymentHistoryDialog from './PaymentHistoryDialog';
import UpadDialog from './UpadDialog';
import LeaveDialog from './LeaveDialog';
import { formatDateDmy } from '../../../utils/helpers';

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
  role?: string;
  phone?: string;
  paymentCycle?: 'Monthly' | 'Weekly';
};

const StaffManagement: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffType[]>([]);
  const [staffForm, setStaffForm] = useState({ name: '', salary: '', role: '', phone: '', paymentCycle: 'Monthly' as 'Monthly' | 'Weekly' });
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyStaffIndex, setHistoryStaffIndex] = useState<number | null>(null);
  const [showUpadDialog, setShowUpadDialog] = useState(false);
  const [upadStaffIndex, setUpadStaffIndex] = useState<number | null>(null);
  const [upadAmount, setUpadAmount] = useState('');
  const [actionAnchorEl, setActionAnchorEl] = useState<null | HTMLElement>(null);
  const [actionMenuIdx, setActionMenuIdx] = useState<number | null>(null);
  const [staffPage, setStaffPage] = useState(0);
  const [summaryMonth, setSummaryMonth] = useState<number | undefined>(undefined);
  const [summaryYear, setSummaryYear] = useState<number | undefined>(undefined);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isAddingUpad, setIsAddingUpad] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveYear, setLeaveYear] = useState<number | ''>('');
  const [leaveMonth, setLeaveMonth] = useState<number | ''>('');
  const [leaveDays, setLeaveDays] = useState<string>('');
  const [confirmPayOpen, setConfirmPayOpen] = useState(false);
  const [confirmPayIndex, setConfirmPayIndex] = useState<number | null>(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [removedStaff, setRemovedStaff] = useState<StaffType[]>([] as any);
  const [refreshNoticeOpen, setRefreshNoticeOpen] = useState(false);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [detailsStaffIndex, setDetailsStaffIndex] = useState<number | null>(null);

  const { currentUser } = useAuth();
  const restaurantId = currentUser?.restaurantId;
  const STAFFS_PER_PAGE = 5;

  // Calculate total staff salary
  const totalStaffSalary = staffList.reduce((sum, s) => sum + s.salary, 0);
  const unpaidStaffSalary = staffList.reduce((sum, staff) => sum + getAmountLeftToPay(staff), 0);

  // Fetch staff list on mount
  useEffect(() => {
    if (restaurantId) {
      fetchStaffList();
    }
  }, [restaurantId]);

  // Persist staffList to localStorage and restore on page load
  useEffect(() => {
    const storedStaffList = localStorage.getItem('owner_staffList');
    if (storedStaffList) setStaffList(JSON.parse(storedStaffList));
    const storedRemoved = localStorage.getItem('owner_removedStaff');
    if (storedRemoved) setRemovedStaff(JSON.parse(storedRemoved));
  }, []);
  useEffect(() => {
    localStorage.setItem('owner_staffList', JSON.stringify(staffList));
    // Notify other parts of the app (e.g., OwnerDashboard) that staff changed
    try {
      window.dispatchEvent(new CustomEvent('staffListUpdated', { detail: staffList }));
    } catch (e) {
      // no-op
    }
  }, [staffList]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Firestore CRUD functions
  const fetchStaffList = async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      const staffArr = await staffService.list(restaurantId);
      setStaffList(staffArr as any);
    } catch (err) {
      setError('Failed to fetch staff list');
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const addStaffToFirestore = async (staff: Omit<StaffType, 'id'>) => {
    if (!restaurantId) {
      setError('Restaurant ID not found. Please re-login.');
      return;
    }
    try {
      const id = await staffService.create(restaurantId, staff as any);
      setStaffList((prev) => [...prev, { ...staff, id }]);
      setSuccess('Staff added');
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
      await staffService.update(restaurantId, id, data as any);
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
      // Snapshot the staff before deletion for history purposes
      const snapshot = staffList.find(s => s.id === id);
      await staffService.remove(restaurantId, id);
      setStaffList((prev) => prev.filter((s) => s.id !== id));
      if (snapshot) {
        const removedEntry: any = { ...snapshot, removed: true };
        setRemovedStaff(prev => {
          const next = [...prev, removedEntry];
          localStorage.setItem('owner_removedStaff', JSON.stringify(next));
          return next;
        });
      }
      setSuccess('Staff removed');
    } catch (err) {
      setError('Failed to remove staff');
      console.error('Error removing staff:', err);
    }
  };

  // Staff handlers
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
      paymentHistory: [],
      role: staffForm.role || undefined,
      phone: staffForm.phone || undefined,
      paymentCycle: staffForm.paymentCycle || 'Monthly'
    };
    setIsAddingStaff(true);
    await addStaffToFirestore(newStaff);
    setIsAddingStaff(false);
    setStaffForm({ name: '', salary: '', role: '', phone: '', paymentCycle: 'Monthly' });
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
    setSuccess('Payment recorded');
  };

  // Removed bulk pay in favor of explicit per-staff confirmation flow

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

    // Do NOT record as raw material expense. Upad flows through analytics via paymentHistory only.
    setSuccess('Advance (Upad) added');
  };

  const handleRemoveStaff = async (index: number) => {
    const staff = staffList[index];
    if (!staff.id) return;
    await removeStaffFromFirestore(staff.id);
  };

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

  const openLeaveDialogForIndex = (index: number) => {
    setActionAnchorEl(null);
    setActionMenuIdx(index);
    setShowLeaveDialog(true);
    const now = new Date();
    setLeaveYear(now.getFullYear());
    setLeaveMonth(now.getMonth());
    setLeaveDays('');
  };

  const handleSaveLeave = async () => {
    if (actionMenuIdx === null) return;
    const idx = actionMenuIdx;
    const staff = staffList[idx];
    if (!staff?.id) return;
    if (leaveYear === '' || leaveMonth === '' || !leaveDays) return;
    const days = Math.max(0, parseInt(leaveDays, 10) || 0);
    const newLeaveHistory = [...(staff.leaveHistory || [])];
    const histIdx = newLeaveHistory.findIndex(l => l.year === leaveYear && l.month === leaveMonth);
    if (histIdx >= 0) {
      newLeaveHistory[histIdx] = { ...newLeaveHistory[histIdx], days: newLeaveHistory[histIdx].days + days };
    } else {
      newLeaveHistory.push({ year: leaveYear as number, month: leaveMonth as number, days });
    }
    const now = new Date();
    const isCurrent = (leaveYear === now.getFullYear()) && (leaveMonth === now.getMonth());
    const currentMonthLeave = newLeaveHistory
      .filter(l => l.year === now.getFullYear() && l.month === now.getMonth())
      .reduce((s, l) => s + l.days, 0);
    const updated: Partial<StaffType> = {
      leaveHistory: newLeaveHistory,
      ...(isCurrent ? { leave: currentMonthLeave } : {}),
    };
    await updateStaffInFirestore(staff.id, updated);
    setShowLeaveDialog(false);
    setSuccess('Leave added');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStaffList();
    setRefreshing(false);
    setRefreshNoticeOpen(true);
  };

  const filteredStaff = useMemo(() => {
    if (!debouncedQuery) return staffList;
    return staffList.filter(s => s.name.toLowerCase().includes(debouncedQuery));
  }, [staffList, debouncedQuery]);

  const paginatedStaff = useMemo(() => {
    const start = staffPage * STAFFS_PER_PAGE;
    return filteredStaff.slice(start, start + STAFFS_PER_PAGE);
  }, [filteredStaff, staffPage]);

  return (
    <Box>
      {/* Staff Management Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>
              👥 Staff Management
            </Typography>
            <RefreshButton onClick={handleRefresh} refreshing={refreshing} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search staff by name…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setStaffPage(0); }}
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" aria-label="clear search" onClick={() => setSearchQuery('')}>
                      <Clear fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
              sx={{ minWidth: 260, bgcolor: '#fff', borderRadius: 2 }}
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setShowStaffDialog(true)}
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
              Add Staff
            </Button>
            <Button
              variant="outlined"
              startIcon={<Assessment />}
              onClick={() => {
                setShowHistoryDialog(true);
                setHistoryStaffIndex(null); // null means show all staff summary
                setSummaryMonth(undefined);
                setSummaryYear(undefined);
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
        <Card sx={{ p: 3, borderRadius: 3, boxShadow: 4, mb: 3, opacity: refreshing ? 0.6 : 1, transition: 'opacity 200ms ease' }}>
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
                {paginatedStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No staff found
                    </TableCell>
                  </TableRow>
                ) : paginatedStaff.map((staff, idx) => {
                  const globalIdx = staffList.findIndex(s => s.id === staff.id);
                  return (
                    <TableRow key={globalIdx} sx={{ '&:nth-of-type(odd)': { bgcolor: '#fafafa' } }}>
                      <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>{staff.name}</TableCell>
                      <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(staff.salary)}</TableCell>
                      <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>{staff.joinDate ? formatDateDmy(staff.joinDate) : '-'}</TableCell>
                      <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>{staff.lastPaidDate ? formatDateDmy(staff.lastPaidDate) : '-'}</TableCell>
                      <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>{staff.pendingMonths}</TableCell>
                      <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format((staff.prepaid || []).find(p => p.month === new Date().getMonth() && p.year === new Date().getFullYear())?.amount || 0)}</TableCell>
                      <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>
                        {(() => {
                          const hist = Array.isArray(staff.leaveHistory) ? staff.leaveHistory : [];
                          const sumHistory = hist.reduce((s, l) => s + l.days, 0);
                          const now = new Date();
                          const hasCurrentInHistory = hist.some(l => l.year === now.getFullYear() && l.month === now.getMonth());
                          const totalLeaves = sumHistory + (hasCurrentInHistory ? 0 : (staff.leave || 0));
                          return (
                            <Chip
                              label={`${totalLeaves} days`}
                              color={totalLeaves > 0 ? 'warning' : 'default'}
                          size="small"
                        />
                          );
                        })()}
                      </TableCell>
                      <TableCell sx={{ py: 0.5, fontSize: '0.95rem' }}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(getAmountLeftToPay(staff))}</TableCell>
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
              if (actionMenuIdx !== null) { 
                setDetailsStaffIndex(actionMenuIdx);
                setShowDetailsDialog(true);
              }
              setActionAnchorEl(null);
            }}>Staff Details</MenuItem>
            <MenuItem onClick={(e) => { 
              e.preventDefault(); 
              e.stopPropagation(); 
              if (actionMenuIdx !== null) { 
                setConfirmPayIndex(actionMenuIdx);
                setConfirmPayOpen(true);
              } 
              setActionAnchorEl(null); 
            }}>Record Payment</MenuItem>
            <MenuItem onClick={(e) => { 
              e.preventDefault(); 
              e.stopPropagation(); 
              if (actionMenuIdx !== null) { 
                setHistoryStaffIndex(actionMenuIdx); 
                setShowHistoryDialog(true); 
              } 
              setActionAnchorEl(null); 
            }}>View History</MenuItem>
            <MenuItem onClick={(e) => { 
              e.preventDefault(); 
              e.stopPropagation(); 
              if (actionMenuIdx !== null) { 
                handleUpad(actionMenuIdx); 
              } 
              setActionAnchorEl(null); 
            }}>Add Upad</MenuItem>
            <MenuItem onClick={(e) => { 
              e.preventDefault(); 
              e.stopPropagation(); 
              if (actionMenuIdx !== null) { 
                openLeaveDialogForIndex(actionMenuIdx);
              }
            }}>Add Leave</MenuItem>
            <MenuItem onClick={(e) => { 
              e.preventDefault(); 
              e.stopPropagation(); 
              if (actionMenuIdx !== null) { 
                setConfirmRemoveOpen(true);
              } 
              setActionAnchorEl(null); 
            }}>Remove Staff</MenuItem>
          </Menu>

          {/* Pagination Controls */}
          <PaginationControls
            page={staffPage}
            setPage={(updater) => setStaffPage((prev) => updater(prev))}
            maxPage={Math.max(0, Math.ceil(filteredStaff.length / STAFFS_PER_PAGE) - 1)}
            color="#6A1B9A"
          />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
            <Typography variant="subtitle1" sx={{ color: '#6A1B9A' }}>
              Total Staff Salary This Month: <b>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(totalStaffSalary)}</b>
            </Typography>
            <Typography variant="subtitle1" sx={{ color: '#F44336' }}>
              Unpaid: <b>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(unpaidStaffSalary)}</b>
            </Typography>
          </Box>
        </Card>

        <PaymentHistoryDialog
          open={showHistoryDialog}
          onClose={() => setShowHistoryDialog(false)}
          staffList={staffList}
          historyStaffIndex={historyStaffIndex}
          onBackToAllStaff={() => setHistoryStaffIndex(null)}
          onSelectStaffIndex={(idx) => setHistoryStaffIndex(idx)}
          getStaffTotals={getStaffTotals as any}
        />

        {/* Add Staff Dialog */}
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Staff Name"
                  value={staffForm.name}
                  onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                  fullWidth
                  required
                  placeholder="Enter full name"
                  autoFocus
                  InputProps={{ startAdornment: <InputAdornment position="start">👤</InputAdornment> }}
                  sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}
                  error={!staffForm.name.trim()}
                  helperText={!staffForm.name.trim() ? 'Name is required' : ' '}
                />
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select
                    label="Role"
                    value={staffForm.role}
                    onChange={(e: any) => setStaffForm({ ...staffForm, role: e.target.value })}
                  >
                    <MenuItem value="">Select role</MenuItem>
                    <MenuItem value="Waiter">Waiter</MenuItem>
                    <MenuItem value="Chef">Chef</MenuItem>
                    <MenuItem value="Manager">Manager</MenuItem>
                    <MenuItem value="Cleaner">Cleaner</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Phone"
                  type="tel"
                  value={staffForm.phone}
                  onChange={e => setStaffForm({ ...staffForm, phone: e.target.value.replace(/[^0-9+\-\s]/g, '') })}
                  fullWidth
                  required
                  placeholder="e.g., +91 98765 43210"
                  InputProps={{ startAdornment: <InputAdornment position="start">📱</InputAdornment> }}
                  sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}
                  error={!/^([+]?\d[\d\s-]{7,})$/.test(staffForm.phone || '')}
                  helperText={!staffForm.phone ? 'Phone is required' : (!/^([+]?\d[\d\s-]{7,})$/.test(staffForm.phone) ? 'Enter a valid phone' : ' ')}
                />
                <TextField
                  label="Monthly Salary"
                  type="number"
                  value={staffForm.salary}
                  onChange={e => setStaffForm({ ...staffForm, salary: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && staffForm.name.trim() && staffForm.salary && parseFloat(staffForm.salary) > 0 && !isAddingStaff) {
                      handleAddStaff();
                    }
                  }}
                  fullWidth
                  required
                  placeholder="e.g., 15000"
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  sx={{ bgcolor: '#f8f9fa', borderRadius: 2 }}
                  error={!staffForm.salary || parseFloat(staffForm.salary) <= 0}
                  helperText={!staffForm.salary || parseFloat(staffForm.salary) <= 0 ? 'Enter a valid amount' : ' '}
                />
                <FormControl fullWidth size="small">
                  <InputLabel>Payment Cycle</InputLabel>
                  <Select
                    label="Payment Cycle"
                    value={staffForm.paymentCycle}
                    onChange={(e: any) => setStaffForm({ ...staffForm, paymentCycle: e.target.value })}
                  >
                    <MenuItem value="Monthly">Monthly</MenuItem>
                    <MenuItem value="Weekly">Weekly</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary">Join date will be set to today ({formatDateDmy(new Date())}).</Typography>
              </Box>
            </Card>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
            <Button onClick={() => setShowStaffDialog(false)} sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Cancel</Button>
            <Button
              onClick={handleAddStaff}
              variant="contained"
              disabled={isAddingStaff || !staffForm.name.trim() || !staffForm.salary || parseFloat(staffForm.salary) <= 0}
              sx={{ bgcolor: '#6A1B9A', color: 'white', fontWeight: 'bold', px: 3, py: 1, fontSize: '1rem', borderRadius: 2, boxShadow: '0 4px 16px rgba(106, 27, 154, 0.18)', '&:hover': { bgcolor: '#4A148C' } }}
            >
              {isAddingStaff ? 'Adding…' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        <UpadDialog
          open={showUpadDialog}
          onClose={() => setShowUpadDialog(false)}
          amount={upadAmount}
          setAmount={setUpadAmount}
          onSave={async () => {
            if (upadStaffIndex !== null && upadAmount) {
              setIsAddingUpad(true);
              await handlePrepaid(upadStaffIndex, parseFloat(upadAmount));
              setIsAddingUpad(false);
              setShowUpadDialog(false);
            }
          }}
          loading={isAddingUpad}
          staffName={upadStaffIndex !== null ? staffList[upadStaffIndex]?.name : undefined}
        />

        <LeaveDialog
          open={showLeaveDialog}
          onClose={() => setShowLeaveDialog(false)}
          year={leaveYear}
          month={leaveMonth}
          days={leaveDays}
          setYear={setLeaveYear}
          setMonth={setLeaveMonth}
          setDays={setLeaveDays}
          onSave={handleSaveLeave}
          staffName={actionMenuIdx !== null ? staffList[actionMenuIdx]?.name : undefined}
        />

        {/* Payment confirmation dialog */}
        <Dialog open={confirmPayOpen} onClose={() => setConfirmPayOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold' }}>Record Payment</DialogTitle>
          <DialogContent>
            {confirmPayIndex !== null && staffList[confirmPayIndex] && (() => {
              const st = staffList[confirmPayIndex];
              const amount = getAmountLeftToPay(st);
              const todaysDate = formatDateDmy(new Date());
              return (
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Staff: <b>{st.name}</b></Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>Monthly Salary: ₹{st.salary}</Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>Current Month Upad: ₹{(st.prepaid || []).find(p => p.month === new Date().getMonth() && p.year === new Date().getFullYear())?.amount || 0}</Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>Leave Deduction: ₹{Math.floor((st.leave || 0) * (st.salary / 30))}</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>Date: {todaysDate}</Typography>
                  <Typography variant="subtitle2">Amount to pay: <b>₹{amount}</b></Typography>
                </Box>
              );
            })()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmPayOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              disabled={isPaying || confirmPayIndex === null || getAmountLeftToPay(staffList[confirmPayIndex]) === 0}
              onClick={async () => {
                if (confirmPayIndex !== null) {
                  setIsPaying(true);
                  await handleMarkPaid(confirmPayIndex);
                  setIsPaying(false);
                }
                setConfirmPayOpen(false);
              }}
            >
              {isPaying ? 'Recording…' : 'Confirm'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Remove staff confirmation dialog */}
        <Dialog open={confirmRemoveOpen} onClose={() => setConfirmRemoveOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold' }}>Remove Staff</DialogTitle>
          <DialogContent>
            {actionMenuIdx !== null && staffList[actionMenuIdx] && (
              <Typography>Are you sure you want to remove <b>{staffList[actionMenuIdx].name}</b>? This action cannot be undone.</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmRemoveOpen(false)}>Cancel</Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => {
                if (actionMenuIdx !== null) {
                  handleRemoveStaff(actionMenuIdx);
                }
                setConfirmRemoveOpen(false);
              }}
            >
              Remove
            </Button>
          </DialogActions>
        </Dialog>

        {/* Staff Details Dialog */}
        <Dialog open={showDetailsDialog} onClose={() => setShowDetailsDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>Staff Details</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {detailsStaffIndex !== null && staffList[detailsStaffIndex] && (() => {
              const st = staffList[detailsStaffIndex];
              const initials = st.name?.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();
              const currency = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(v);
              const amountLeft = getAmountLeftToPay(st);
              return (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#6A1B9A' }}>{initials}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{st.name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={st.role || 'Staff'} size="small" />
                        <Chip label={st.paymentCycle || 'Monthly'} size="small" color="info" />
                        <Chip label={amountLeft === 0 ? 'Paid' : 'Unpaid'} size="small" color={amountLeft === 0 ? 'success' : 'warning'} />
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 1.2, columnGap: 2, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Phone</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button size="small" startIcon={<PhoneIcon />} href={st.phone ? `tel:${st.phone}` : undefined} disabled={!st.phone} sx={{ textTransform: 'none' }}>
                        {st.phone || '-'}
                      </Button>
                      {st.phone && (
                        <Tooltip title="Copy">
                          <IconButton size="small" onClick={() => navigator.clipboard.writeText(st.phone as string)}>
                            <ContentCopyIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">Joined</Typography>
                    <Typography variant="body2">{st.joinDate ? formatDateDmy(st.joinDate) : '-'}</Typography>
                    <Typography variant="body2" color="text.secondary">Last Paid</Typography>
                    <Typography variant="body2">{st.lastPaidDate ? formatDateDmy(st.lastPaidDate) : '-'}</Typography>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2 }}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Monthly Salary</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{currency(st.salary)}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Amount Left</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: amountLeft === 0 ? 'success.main' : 'warning.main' }}>{currency(amountLeft)}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Pending Months</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{st.pendingMonths || 0}</Typography>
                    </Paper>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
                    <Button fullWidth variant="outlined" startIcon={<HistoryIcon />} onClick={() => { setShowDetailsDialog(false); setHistoryStaffIndex(detailsStaffIndex); setShowHistoryDialog(true); }} sx={{ textTransform: 'none' }}>View History</Button>
                    <Button fullWidth variant="outlined" startIcon={<BeachAccessIcon />} onClick={() => { setShowDetailsDialog(false); if (detailsStaffIndex !== null) openLeaveDialogForIndex(detailsStaffIndex); }} sx={{ textTransform: 'none' }}>Add Leave</Button>
                    <Button fullWidth variant="contained" startIcon={<MonetizationOnIcon />} onClick={() => { setShowDetailsDialog(false); setConfirmPayIndex(detailsStaffIndex); setConfirmPayOpen(true); }} sx={{ textTransform: 'none', bgcolor: '#6A1B9A', '&:hover': { bgcolor: '#4A148C' } }}>Record Payment</Button>
                  </Box>
                </Box>
              );
            })()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
        {/* Toasts */}
        {/* Refresh snackbar - top center */}
        <Snackbar open={refreshNoticeOpen} autoHideDuration={2000} onClose={() => setRefreshNoticeOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity="success" onClose={() => setRefreshNoticeOpen(false)} sx={{ width: '100%' }}>
            Refreshed
          </Alert>
        </Snackbar>

        {/* General success snackbar - bottom center */}
        <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity="success" onClose={() => setSuccess('')} sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>
        <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity="error" onClose={() => setError('')} sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default StaffManagement; 