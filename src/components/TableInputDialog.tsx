import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography
} from '@mui/material';

interface TableInputDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (tableNumber: string, hallType: 'common' | 'ac') => void;
  currentHallType: 'common' | 'ac';
}

const TableInputDialog: React.FC<TableInputDialogProps> = ({
  open,
  onClose,
  onSubmit,
  currentHallType
}) => {
  const [tableNumber, setTableNumber] = useState('');
  const [hallType, setHallType] = useState<'common' | 'ac'>(currentHallType);
  const [isValidFormat, setIsValidFormat] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  useEffect(() => {
    console.log('TableInputDialog useEffect - open:', open, 'currentHallType:', currentHallType);
    
    if (open) {
      // Reset all state
      setTableNumber('');
      setHallType(currentHallType);
      setIsValidFormat(false);
      
      // Electron-specific focus handling with longer delays
      const focusAttempts = [100, 300, 600, 1000, 1500, 2000];
      
      focusAttempts.forEach(delay => {
        setTimeout(() => {
          if (inputRef.current) {
            console.log('Attempting focus with delay:', delay);
            try {
              inputRef.current.focus();
              inputRef.current.select();
              // Force focus in Electron
              if (window.electronAPI) {
                inputRef.current.click();
              }
            } catch (error) {
              console.error('Focus error:', error);
            }
          } else {
            console.log('Input ref not available for delay:', delay);
          }
        }, delay);
      });
    } else {
      // Reset state when dialog closes
      setTableNumber('');
      setHallType(currentHallType);
      setIsValidFormat(false);
    }
  }, [open, currentHallType]);

  const handleSubmit = () => {
    if (tableNumber.trim()) {
      // Validate table number format: L or P followed by numbers only
      const tableNumberPattern = /^[LP]\d+$/;
      if (!tableNumberPattern.test(tableNumber.trim())) {
        // Show error message
        alert('❌ Invalid table number format!\n\nPlease use:\n• L followed by numbers (e.g., L1, L2, L10)\n• P followed by numbers (e.g., P1, P2, P10)\n\nOnly letters L/P and numbers are allowed.');
        return;
      }
      
      onSubmit(tableNumber.trim(), hallType);
      onClose();
    }
  };

  const handleClose = () => {
    setTableNumber('');
    setHallType(currentHallType);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setHallType(hallType === 'common' ? 'ac' : 'common');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableRestoreFocus={false}
      disableAutoFocus={false}
      disableEnforceFocus={false}
      keepMounted={false}
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'white',
        color: '#6A1B9A',
        textAlign: 'center',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '1.5rem' }}>🆕</Typography>
          <Typography variant="h6" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>Create New Table</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 3 }} onClick={() => {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            // Electron-specific focus handling
            if (window.electronAPI) {
              inputRef.current.click();
            }
          }
        }, 100);
      }}>
        <TextField
          label="🏷️ Table Number"
          value={tableNumber}
          onChange={(e) => {
            const value = e.target.value.toUpperCase();
            // Only allow L, P, and numbers
            const filteredValue = value.replace(/[^LP0-9]/g, '');
            setTableNumber(filteredValue);
            
            // Validate format in real-time
            const tableNumberPattern = /^[LP]\d+$/;
            setIsValidFormat(tableNumberPattern.test(filteredValue));
          }}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          fullWidth
          margin="dense"
          placeholder="e.g., P1, P2, L1, L2"
          inputRef={inputRef}
          helperText={
            tableNumber ? (
              isValidFormat ? 
                '✅ Valid table number format' : 
                '❌ Must start with L or P followed by numbers only'
            ) : 
            '💡 Enter table number (L1, P2, etc.)'
          }
          error={tableNumber ? !isValidFormat : false}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover fieldset': {
                borderColor: isValidFormat ? '#4CAF50' : '#E0E0E0',
              },
              '&.Mui-focused fieldset': {
                borderColor: isValidFormat ? '#4CAF50' : '#E0E0E0',
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
            }
          }}
        />

        {/* Hall Type Selection */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#6A1B9A' }}>
            🏢 Hall Type: <span style={{ color: hallType === 'common' ? '#6A1B9A' : '#2196F3', fontWeight: 'bold' }}>
              {hallType === 'common' ? '🏠 Common Hall' : '❄️ AC Hall'}
            </span>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={hallType === 'common' ? 'contained' : 'outlined'}
              onClick={() => setHallType('common')}
              size="small"
              sx={{
                flex: 1,
                borderColor: '#6A1B9A',
                color: hallType === 'common' ? 'white' : '#6A1B9A',
                bgcolor: hallType === 'common' ? '#6A1B9A' : 'transparent',
                '&:hover': {
                  bgcolor: hallType === 'common' ? '#4A148C' : '#6A1B9A20',
                },
                borderRadius: 2,
              }}
            >
              🏠 Common Hall
            </Button>
            <Button
              variant={hallType === 'ac' ? 'contained' : 'outlined'}
              onClick={() => setHallType('ac')}
              size="small"
              sx={{
                flex: 1,
                borderColor: '#2196F3',
                color: hallType === 'ac' ? 'white' : '#2196F3',
                bgcolor: hallType === 'ac' ? '#2196F3' : 'transparent',
                '&:hover': {
                  bgcolor: hallType === 'ac' ? '#1976D2' : '#2196F320',
                },
                borderRadius: 2,
              }}
            >
              ❄️ AC Hall
            </Button>
          </Box>
          <Typography variant="caption" sx={{ color: '#7B2CBF', mt: 1, display: 'block' }}>
            💡 Press <strong>Tab</strong> to toggle between hall types
          </Typography>
        </Box>
        
        <Box sx={{ 
          mt: 2, 
          p: 2, 
          bgcolor: '#f8f9fa', 
          borderRadius: 2,
          border: '1px solid #dee2e6'
        }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#6A1B9A' }}>
            📋 Table Number Format:
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>
                👥 Private Customers
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                P1, P2, P3, P4...
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: '#FF9800', fontWeight: 'bold' }}>
                🚛 Loading Customers
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                L1, L2, L3, L4...
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ 
          mt: 2, 
          p: 2, 
          bgcolor: '#f3e5f5', 
          borderRadius: 2,
          border: '1px solid #e1bee7'
        }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#7B2CBF' }}>
            ⌨️ Keyboard Shortcuts:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#7B2CBF', fontWeight: 'medium' }}>
              • <strong>Tab:</strong> Toggle between Common Hall ↔ AC Hall
            </Typography>
            <Typography variant="caption" sx={{ color: '#7B2CBF', fontWeight: 'medium' }}>
              • <strong>Enter:</strong> Create table and start billing
            </Typography>
            <Typography variant="caption" sx={{ color: '#7B2CBF', fontWeight: 'medium' }}>
              • <strong>N:</strong> Open new table dialog (anywhere in app)
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, bgcolor: '#f8f9fa' }}>
        <Button 
          onClick={handleClose}
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
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={!tableNumber.trim() || !isValidFormat}
          sx={{
            background: isValidFormat && tableNumber.trim() 
              ? 'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)' 
              : '#f5f5f5',
            color: isValidFormat && tableNumber.trim() ? 'white' : '#bdbdbd',
            '&:hover': {
              background: isValidFormat && tableNumber.trim()
                ? 'linear-gradient(135deg, #4A148C 0%, #6A1B9A 100%)'
                : '#f5f5f5'
            },
            px: 3,
            boxShadow: isValidFormat && tableNumber.trim() 
              ? '0 4px 15px rgba(106, 27, 154, 0.3)' 
              : 'none',
            '&:disabled': {
              background: '#f5f5f5',
              color: '#bdbdbd',
              boxShadow: 'none'
            }
          }}
        >
          🚀 Start Billing
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TableInputDialog; 