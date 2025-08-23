import React from "react";
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
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider
} from "@mui/material";
import {
  Add,
  Refresh
} from "@mui/icons-material";
import RefreshButton from "../common/RefreshButton";

interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  createdBy: string;
  createdAt: Date;
}

interface ExpenseManagementProps {
  filteredExpensesForDisplay: Expense[];
  totalExpensesForDisplay: number;
  onAddExpense: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  dateFilterLabel?: string;
  restaurantType?: 'Veg' | 'Non-Veg';
}

const ExpenseManagement: React.FC<ExpenseManagementProps> = ({
  filteredExpensesForDisplay,
  totalExpensesForDisplay,
  onAddExpense,
  refreshing = false,
  onRefresh,
  dateFilterLabel = "Filter synced with Revenue Dashboard",
  restaurantType = 'Non-Veg'
}) => {
  const allowedCategoryNames = (() => {
    if (restaurantType === 'Veg') return ['Vegetables', 'Dairy', 'Spices', 'Electricity', 'Other'];
    // Non-Veg acts as both
    return ['Vegetables', 'Dairy', 'Meat', 'Spices', 'Electricity', 'Other'];
  })();
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>
              🛒 Raw Material Expenses
            </Typography>
            {onRefresh && (
              <RefreshButton onClick={onRefresh} refreshing={refreshing} />
            )}
          </Box>
          <Typography variant="body2" color="textSecondary">
            Track kitchen expenses and raw material costs • {dateFilterLabel}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAddExpense}
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
        {[
          { name: 'Vegetables', icon: '🥬', color: '#4CAF50' }, 
          { name: 'Dairy', icon: '🥛', color: '#FF9800' }, 
          { name: 'Meat', icon: '🥩', color: '#F44336' }, 
          { name: 'Spices', icon: '🌶️', color: '#9C27B0' }, 
          { name: 'Electricity', icon: '⚡', color: '#2196F3' },
          { name: 'Other', icon: '📦', color: '#607D8B' }
        ].filter(c => allowedCategoryNames.includes(c.name)).map((category) => {
          const categoryExpenses = filteredExpensesForDisplay.filter((exp: Expense) => exp.category === category.name);
          const total = categoryExpenses.reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
          return (
            <Card key={category.name} sx={{ 
              background: `linear-gradient(135deg, ${category.color}20 0%, #fff 100%)`, 
              color: category.color 
            }}>
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
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mb: 3, 
        p: 2, 
        bgcolor: '#f8f9fa', 
        borderRadius: 2, 
        border: '1px solid #e0e0e0' 
      }}>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>
            ₹{filteredExpensesForDisplay.reduce((sum: number, exp: Expense) => sum + exp.amount, 0).toLocaleString()}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Total Expenses - {dateFilterLabel}
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
                  <TableCell>
                    {new Date(expense.date).toLocaleDateString('en-GB', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </TableCell>
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
  );
};

export default ExpenseManagement; 