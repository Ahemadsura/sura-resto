import React from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  CircularProgress
} from "@mui/material";
import {
  Refresh,
  Visibility
} from "@mui/icons-material";
import { Bill } from "../../../types";
import RefreshButton from "../common/RefreshButton";
import PaginationControls from "../common/PaginationControls";

interface BillHistoryProps {
  paginatedBills: Bill[];
  billPage: number;
  setBillPage: (page: number | ((prev: number) => number)) => void;
  maxBillPage: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  dateFilterLabel?: string;
  billsCount?: number;
}

const BillHistory: React.FC<BillHistoryProps> = ({
  paginatedBills,
  billPage,
  setBillPage,
  maxBillPage,
  refreshing = false,
  onRefresh,
  dateFilterLabel = "Filter synced with Revenue Dashboard",
  billsCount = 0
}) => {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>
              📄 Bill History
            </Typography>
            {onRefresh && (
              <RefreshButton onClick={onRefresh} refreshing={refreshing} />
            )}
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
            <Typography variant="body2" sx={{ color: '#e65100', fontWeight: 'medium' }}>
              {dateFilterLabel}
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', ml: 1 }}>
              • Filter synced with Revenue Dashboard
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ color: '#e65100', fontWeight: 'bold' }}>
              {billsCount} bills in period
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
            {paginatedBills.length === 0 ? (
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
              paginatedBills.map((bill) => {
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
      {paginatedBills.length > 0 && (
        <PaginationControls page={billPage} setPage={setBillPage} maxPage={maxBillPage} color="#6A1B9A" />
      )}
    </Box>
  );
};

export default BillHistory;
