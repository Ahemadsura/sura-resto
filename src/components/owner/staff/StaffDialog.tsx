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
  InputAdornment
} from "@mui/material";

interface StaffFormData {
  name: string;
  salary: string;
  joinDate: string;
}

interface StaffDialogProps {
  open: boolean;
  onClose: () => void;
  formData: StaffFormData;
  setFormData: (data: StaffFormData) => void;
  onSave: () => void;
  loading?: boolean;
}

const StaffDialog: React.FC<StaffDialogProps> = ({
  open,
  onClose,
  formData,
  setFormData,
  onSave,
  loading = false
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && formData.name && formData.salary) {
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
        Add New Staff Member
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
              label="Staff Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onKeyPress={handleKeyPress}
              required
              fullWidth
              InputProps={{ startAdornment: <InputAdornment position="start">👤</InputAdornment> }}
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
            <TextField
              label="Monthly Salary"
              type="number"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
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
          </Box>
          <TextField
            label="Join Date"
            type="date"
            value={formData.joinDate}
            onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
            onKeyPress={handleKeyPress}
            required
            fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start">📅</InputAdornment> }}
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
          disabled={!formData.name || !formData.salary || !formData.joinDate || loading}
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
          {loading ? 'Adding...' : 'Add Staff'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StaffDialog; 