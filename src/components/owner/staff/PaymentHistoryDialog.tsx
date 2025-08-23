import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  InputAdornment,
  Divider,
  Chip
} from "@mui/material";
import { formatDateDmy } from '../../../utils/helpers';
import {
  AttachMoney,
  TrendingDown,
  DateRange,
  TrendingUp
} from "@mui/icons-material";

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

interface PaymentHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  staffList: StaffType[];
  historyStaffIndex: number | null;
  onBackToAllStaff?: () => void;
  onSelectStaffIndex?: (index: number) => void;
  getStaffTotals: (
    staff: StaffType,
    { month, year }: { month?: number; year?: number }
  ) => {
    salaryTotal: number;
    upadTotal: number;
    leaveTotal: number;
    daysWorked: number;
  };
}

const PaymentHistoryDialog: React.FC<PaymentHistoryDialogProps> = ({
  open,
  onClose,
  staffList,
  historyStaffIndex,
  onBackToAllStaff,
  onSelectStaffIndex,
  getStaffTotals
}) => {
  const [staffHistorySearch, setStaffHistorySearch] = useState('');
  const [summaryMonth, setSummaryMonth] = useState<number | undefined>(undefined);
  const [summaryYear, setSummaryYear] = useState<number | undefined>(undefined);
  
  const currentStaff = historyStaffIndex !== null && historyStaffIndex >= 0 
    ? staffList[historyStaffIndex] 
    : null;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dialogTitle = historyStaffIndex === null
    ? 'Staff Payment History'
    : `${currentStaff?.name || ''} Payment History`;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
    >
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
        {dialogTitle}
      </DialogTitle>
      <DialogContent sx={{
        pt: 3,
        pb: 2,
        px: 4,
        bgcolor: 'linear-gradient(135deg, #f3e5f5 0%, #ede7f6 100%)',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8
      }}>
        {historyStaffIndex === null ? (
          // All staff summary view (Summary by Staff only)
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
                    value={summaryYear !== undefined ? String(summaryYear) : ''}
                    label="Year"
                    onChange={e => setSummaryYear(e.target.value === '' ? undefined : Number(e.target.value))}
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
                    value={summaryMonth !== undefined ? String(summaryMonth) : ''}
                    label="Month"
                    onChange={e => setSummaryMonth(e.target.value === '' ? undefined : Number(e.target.value))}
                    disabled={summaryYear === undefined}
                  >
                    <MenuItem value="">All Months</MenuItem>
                    {summaryYear !== undefined && Array.from(new Set(staffList.flatMap(staff => staff.paymentHistory.filter(h => h.year === summaryYear).map(h => h.month)))).sort((a, b) => a - b).map(m => (
                      <MenuItem key={m} value={m}>{monthNames[m]}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button size="small" onClick={() => { setSummaryMonth(undefined); setSummaryYear(undefined); }}>Reset</Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 3, mb: 1 }}>
                {(() => {
                  let salaryTotal = 0, upadTotal = 0, leaveTotal = 0;
                  staffList.forEach((staff: StaffType) => {
                    const t = getStaffTotals(
                      staff,
                      summaryMonth !== undefined && summaryYear !== undefined
                        ? { month: summaryMonth, year: summaryYear }
                        : summaryYear !== undefined
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
            <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #fff 80%, #ede7f6 100%)' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)' }}>
                    <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Total Salary</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Total Upad</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Total Leave</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Days Worked</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...staffList, ...((typeof window !== 'undefined' && localStorage.getItem('owner_removedStaff')) ? JSON.parse(localStorage.getItem('owner_removedStaff') as string) : [])]
                    .filter(staff => staff.name.toLowerCase().includes(staffHistorySearch.toLowerCase()))
                    .map((staff, i) => {
                      const t = getStaffTotals(
                        staff,
                        summaryMonth !== undefined && summaryYear !== undefined
                          ? { month: summaryMonth, year: summaryYear }
                          : summaryYear !== undefined
                            ? { year: summaryYear }
                            : {}
                      );
                      return (
                        <TableRow key={i} hover style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                          onClick={() => onSelectStaffIndex && onSelectStaffIndex(i)}
                          sx={{ '&:hover': { background: 'linear-gradient(90deg, #ede7f6 0%, #fff 100%)' } }}
                        >
                          <TableCell>{staff.name}</TableCell>
                          <TableCell>₹{t.salaryTotal}</TableCell>
                          <TableCell>₹{t.upadTotal}</TableCell>
                          <TableCell>{t.leaveTotal} days</TableCell>
                          <TableCell>{t.daysWorked}</TableCell>
                          <TableCell>
                            {'removed' in staff ? (
                              <Chip label="Removed" size="small" color="error" />
                            ) : (
                              <Chip label="Active" size="small" color="success" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          // Single staff view
          currentStaff && (
            <>
              <Button size="small" sx={{ mb: 2 }} onClick={onBackToAllStaff}>← Back to All Staff</Button>
              {/* Enhanced Single Staff Summary */}
              <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                {(() => {
                  const { salaryTotal, upadTotal, leaveTotal, daysWorked } = getStaffTotals(
                    currentStaff,
                    summaryMonth !== undefined && summaryYear !== undefined
                      ? { month: summaryMonth, year: summaryYear }
                      : summaryYear !== undefined
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
                      value={summaryYear !== undefined ? String(summaryYear) : ''}
                      label="Year"
                      onChange={e => setSummaryYear(e.target.value === '' ? undefined : Number(e.target.value))}
                    >
                      <MenuItem value="">All Years</MenuItem>
                      {Array.from(new Set(currentStaff.paymentHistory.map(h => h.year))).map(y => (
                        <MenuItem key={y} value={y}>{y}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Month</InputLabel>
                    <Select
                      value={summaryMonth !== undefined ? String(summaryMonth) : ''}
                      label="Month"
                      onChange={e => setSummaryMonth(e.target.value === '' ? undefined : Number(e.target.value))}
                      disabled={summaryYear === undefined}
                    >
                      <MenuItem value="">All Months</MenuItem>
                      {summaryYear !== undefined && Array.from(new Set(currentStaff.paymentHistory.filter(h => h.year === summaryYear).map(h => h.month))).sort((a, b) => a - b).map(m => (
                        <MenuItem key={m} value={m}>{monthNames[m]}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button size="small" onClick={() => { setSummaryMonth(undefined); setSummaryYear(undefined); }}>Reset</Button>
                </Box>
              </Paper>
              {/* Payment History Table */}
              <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #fff 80%, #ede7f6 100%)' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ background: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)' }}>
                      <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Month/Year</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentStaff.paymentHistory
                      .filter(payment => {
                        if (summaryYear !== undefined && payment.year !== summaryYear) return false;
                        if (summaryMonth !== undefined && payment.month !== summaryMonth) return false;
                        return true;
                      })
                      .sort((a, b) => {
                        if (a.year !== b.year) return b.year - a.year;
                        if (a.month !== b.month) return b.month - a.month;
                        return new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime();
                      })
                      .map((payment, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{formatDateDmy(payment.paidDate)}</TableCell>
                          <TableCell>
                            <Chip
                              label={payment.type === 'salary' ? 'Salary' : 'Upad'}
                              color={payment.type === 'salary' ? 'primary' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>₹{payment.amount}</TableCell>
                          <TableCell>{monthNames[payment.month]} {payment.year}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )
        )}
      </DialogContent>
      <DialogActions sx={{
        px: 4,
        py: 2,
        bgcolor: 'linear-gradient(135deg, #ede7f6 0%, #f3e5f5 100%)',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8
      }}>
        <Button 
          onClick={onClose}
          variant="contained"
          sx={{
            bgcolor: '#6A1B9A',
            color: 'white',
            fontWeight: 'bold',
            px: 3,
            py: 1,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1rem',
            '&:hover': {
              bgcolor: '#4A148C'
            }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentHistoryDialog; 