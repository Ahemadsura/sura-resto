import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { formatCurrency } from '../../utils/helpers';
import { BillTotals } from './types';

interface BillSummaryProps {
  totals: BillTotals;
  itemCount: number;
  totalQuantity: number;
}

const BillSummary: React.FC<BillSummaryProps> = ({
  totals,
  itemCount,
  totalQuantity
}) => {
  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        Bill Summary
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            Qty: {totalQuantity} | Disc: {itemCount}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Items: {itemCount}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2">Subtotal:</Typography>
          <Typography variant="body2">{formatCurrency(totals.subtotal)}</Typography>
        </Box>
        
        {totals.discountAmount > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="error.main">Discount:</Typography>
            <Typography variant="body2" color="error.main">
              -{formatCurrency(totals.discountAmount)}
            </Typography>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2">CGST + SGST ({(18).toFixed(0)}%):</Typography>
          <Typography variant="body2">{formatCurrency(totals.taxAmount)}</Typography>
        </Box>
        
        <Divider />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Total:
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {formatCurrency(totals.totalAmount)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default BillSummary; 