import React from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Autocomplete,
  InputAdornment
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { MenuItem as MenuItemType } from '../../types';

interface ItemAdditionFormProps {
  menuItems: MenuItemType[];
  selectedMenuItem: MenuItemType | null;
  quantity: string;
  customPrice: number | null;
  onMenuItemChange: (item: MenuItemType | null) => void;
  onQuantityChange: (quantity: string) => void;
  onCustomPriceChange: (price: number | null) => void;
  onAddItem: () => void;
  onResetForm: () => void;
  itemNoFieldRef: React.RefObject<HTMLInputElement>;
  itemNameFieldRef: React.RefObject<HTMLInputElement>;
  quantityFieldRef: React.RefObject<HTMLInputElement>;
}

// Common styling for all input fields
const commonInputSx = {
  '& .MuiOutlinedInput-root': {
    height: '40px', // Fixed height for consistency
    '& input': {
      padding: '8.5px 14px', // Consistent padding
    },
    '&.MuiAutocomplete-inputRoot': {
      padding: '0px', // Reset autocomplete padding
      '& input': {
        padding: '8.5px 14px', // Apply consistent padding to autocomplete input
      }
    }
  },
  '& .MuiInputLabel-root': {
    transform: 'translate(14px, 12px) scale(1)', // Consistent label positioning
    '&.MuiInputLabel-shrink': {
      transform: 'translate(14px, -6px) scale(0.75)',
    }
  }
};

const ItemAdditionForm: React.FC<ItemAdditionFormProps> = ({
  menuItems,
  selectedMenuItem,
  quantity,
  customPrice,
  onMenuItemChange,
  onQuantityChange,
  onCustomPriceChange,
  onAddItem,
  onResetForm,
  itemNoFieldRef,
  itemNameFieldRef,
  quantityFieldRef
}) => {
  return (
    <Paper sx={{ p: 1, mb: 1, bgcolor: 'grey.50' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Add Items</Typography>
        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'medium' }}>
          💡 Press Enter to add quickly
        </Typography>
      </Box>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1fr', gap: 1, alignItems: 'end' }}>
        {/* Item Number Field */}
        <Autocomplete
          options={menuItems}
          getOptionLabel={(option) => option.itemNo}
          value={selectedMenuItem}
          onChange={(_, newValue) => {
            onMenuItemChange(newValue);
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
              sx={commonInputSx}
            />
          )}
        />

        {/* Item Name Field */}
        <Autocomplete
          options={menuItems}
          getOptionLabel={(option) => option.name}
          value={selectedMenuItem}
          onChange={(_, newValue) => {
            onMenuItemChange(newValue);
            if (quantityFieldRef.current) {
              quantityFieldRef.current.focus();
            }
          }}
          filterOptions={(options, { inputValue }) => {
            if (!inputValue) return options;
            const searchValue = inputValue.toLowerCase().trim();
            return options.filter(option => 
              option.name.toLowerCase().includes(searchValue) ||
              option.itemNo.toLowerCase().includes(searchValue)
            );
          }}
          renderInput={(params) => (
            <TextField 
              {...params} 
              label="Item Name" 
              placeholder="Search by name..."
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
              sx={commonInputSx}
            />
          )}
        />

        {/* Quantity Field */}
        <TextField
          label="Quantity"
          value={quantity}
          onChange={(e) => onQuantityChange(e.target.value)}
          variant="outlined"
          type="number"
          inputRef={quantityFieldRef}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAddItem();
            }
          }}
          inputProps={{ min: 1, step: 1 }}
          sx={commonInputSx}
        />

        {/* Price Field */}
        <TextField
          label="Price"
          value={selectedMenuItem ? 
            (customPrice !== null ? customPrice.toString() : 'Auto') : 
            ''
          }
          onChange={(e) => {
            const value = e.target.value.replace('₹', '');
            if (value === 'Auto' || value === '') {
              onCustomPriceChange(null);
            } else {
              const price = parseFloat(value);
              if (!isNaN(price)) {
                onCustomPriceChange(price);
              }
            }
          }}
          variant="outlined"
          disabled={!selectedMenuItem}
          placeholder={customPrice === null ? "Auto" : "Custom"}
          InputProps={{
            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
          }}
          sx={{
            ...commonInputSx,
            '& .MuiOutlinedInput-root': {
              ...commonInputSx['& .MuiOutlinedInput-root'],
              '& input': {
                ...commonInputSx['& .MuiOutlinedInput-root']['& input'],
                paddingLeft: '0px', // Adjust for startAdornment
              }
            }
          }}
        />

        {/* Total Display */}
        <TextField
          label="Total"
          value={selectedMenuItem && quantity ? 
            `₹${((customPrice || (selectedMenuItem.privatePrice || 0)) * parseInt(quantity || '0')).toFixed(0)}` : 
            '₹0'
          }
          variant="outlined"
          disabled
          sx={{
            ...commonInputSx,
            '& .MuiOutlinedInput-root': {
              ...commonInputSx['& .MuiOutlinedInput-root'],
              backgroundColor: '#f5f5f5',
            }
          }}
        />

        {/* Add Button */}
        <Button 
          variant="contained" 
          onClick={onAddItem}
          disabled={!selectedMenuItem || !quantity || parseInt(quantity) <= 0}
          startIcon={<Add />}
          sx={{ 
            height: '40px', // Match input field height
            borderRadius: 1,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          ADD ITEM
        </Button>
      </Box>
    </Paper>
  );
};

export default ItemAdditionForm; 