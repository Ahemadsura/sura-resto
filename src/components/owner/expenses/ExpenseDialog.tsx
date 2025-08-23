import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Card,
  InputAdornment
} from "@mui/material";

interface ExpenseFormData {
  category: string;
  description: string;
  amount: string;
  date: string;
}

interface ExpenseDialogProps {
  open: boolean;
  onClose: () => void;
  formData: ExpenseFormData;
  setFormData: (data: ExpenseFormData) => void;
  onSave: () => void;
  loading?: boolean;
  restaurantType?: 'Veg' | 'Non-Veg';
}

const ExpenseDialog: React.FC<ExpenseDialogProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  onSave,
  loading = false,
  restaurantType = 'Non-Veg'
}) => {
  const allowedCategories = (() => {
    if (restaurantType === 'Veg') return ['Vegetables', 'Dairy', 'Spices', 'Other', 'Electricity'];
    // Non-Veg acts as both (Veg + Non-Veg)
    return ['Vegetables', 'Dairy', 'Meat', 'Spices', 'Other', 'Electricity'];
  })();
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
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
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
              InputProps={{ startAdornment: <InputAdornment position="start">📅</InputAdornment> }}
            />
            <FormControl required>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                label="Category"
                startAdornment={<InputAdornment position="start">📦</InputAdornment>}
              >
                {allowedCategories.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c === 'Dairy' ? 'Dairy Products' : c === 'Meat' ? 'Meat & Seafood' : c === 'Spices' ? 'Spices & Seasonings' : c === 'Other' ? 'Other Kitchen Supplies' : c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3, mb: 3 }}>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Fresh tomatoes, chicken breast, etc."
              InputProps={{ startAdornment: <InputAdornment position="start">📝</InputAdornment> }}
            />
            <TextField
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
        <Button 
          onClick={onClose} 
          sx={{ fontWeight: 'bold', color: '#6A1B9A' }}
        >
          Cancel
        </Button>
        <Button 
          onClick={onSave} 
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
  );
};

export default ExpenseDialog; 