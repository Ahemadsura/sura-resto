import React from "react";
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
  InputAdornment
} from "@mui/material";

interface UpadDialogProps {
  open: boolean;
  onClose: () => void;
  amount: string;
  setAmount: (amount: string) => void;
  onSave: () => void;
  loading?: boolean;
  staffName?: string;
}

const UpadDialog: React.FC<UpadDialogProps> = ({
  open,
  onClose,
  amount,
  setAmount,
  onSave,
  loading = false,
  staffName = "Staff Member"
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && amount && parseFloat(amount) > 0) {
      onSave();
    }
  };

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
        Add Advance Payment (Upad)
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
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ color: '#6A1B9A', fontWeight: 'bold', mb: 1 }}>
              Staff Member: {staffName}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Enter the advance payment amount to be deducted from the monthly salary
            </Typography>
          </Box>
          
          <TextField
            label="Advance Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyPress={handleKeyPress}
            required
            fullWidth
            InputProps={{ 
              startAdornment: <InputAdornment position="start">💰</InputAdornment>,
              endAdornment: <InputAdornment position="end">₹</InputAdornment>
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: '#6A1B9A',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#6A1B9A',
                }
              }
            }}
          />
          
          <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(106, 27, 154, 0.05)', borderRadius: 2 }}>
            <Typography variant="body2" color="textSecondary">
              💡 <strong>Note:</strong> This advance payment will be deducted from the staff member's monthly salary.
            </Typography>
          </Box>
        </Card>
      </DialogContent>
      <DialogActions sx={{
        px: 4,
        py: 2,
        bgcolor: 'linear-gradient(135deg, #ede7f6 0%, #f3e5f5 100%)',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16
      }}>
        <Button 
          onClick={onClose}
          sx={{
            color: '#6A1B9A',
            fontWeight: 'bold',
            px: 3,
            py: 1,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1rem',
            '&:hover': {
              bgcolor: 'rgba(106, 27, 154, 0.1)'
            }
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={onSave}
          disabled={!amount || parseFloat(amount) <= 0 || loading}
          variant="contained"
          sx={{
            bgcolor: '#6A1B9A',
            color: 'white',
            fontWeight: 'bold',
            px: 4,
            py: 1,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1rem',
            boxShadow: '0 4px 16px rgba(106, 27, 154, 0.3)',
            '&:hover': {
              bgcolor: '#4A148C'
            },
            '&:disabled': {
              bgcolor: '#ccc',
              color: '#666'
            }
          }}
        >
          {loading ? 'Adding...' : 'Add Upad'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UpadDialog; 