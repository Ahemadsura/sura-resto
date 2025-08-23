import React, { useMemo } from "react";
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
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  InputAdornment
} from "@mui/material";

interface LeaveDialogProps {
  open: boolean;
  onClose: () => void;
  year: number | '';
  month: number | '';
  days: string;
  setYear: (y: number | '') => void;
  setMonth: (m: number | '') => void;
  setDays: (d: string) => void;
  onSave: () => void;
  loading?: boolean;
  staffName?: string;
}

const LeaveDialog: React.FC<LeaveDialogProps> = ({
  open,
  onClose,
  year,
  month,
  days,
  setYear,
  setMonth,
  setDays,
  onSave,
  loading = false,
  staffName = 'Staff Member'
}) => {
  const monthNames = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  const canSave = year !== '' && month !== '' && !!days && parseInt(days) > 0 && !loading;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
        Add Leave
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2, px: 4, bgcolor: 'linear-gradient(135deg, #f3e5f5 0%, #ede7f6 100%)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
        <Card sx={{ p: 3, borderRadius: 4, boxShadow: 6, background: 'linear-gradient(135deg, #fff 60%, #ede7f6 100%)', mb: 2, maxWidth: 520, mx: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>Staff Member: {staffName}</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl fullWidth size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Year</InputLabel>
                <Select
                  label="Year"
                  value={year === '' ? '' : String(year)}
                  onChange={(e) => setYear(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <MenuItem value="">Select Year</MenuItem>
                  {Array.from({ length: 6 }).map((_, i) => {
                    const y = new Date().getFullYear() - 3 + i;
                    return <MenuItem key={y} value={y}>{y}</MenuItem>;
                  })}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Month</InputLabel>
                <Select
                  label="Month"
                  value={month === '' ? '' : String(month)}
                  onChange={(e) => setMonth(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={year === ''}
                >
                  <MenuItem value="">Select Month</MenuItem>
                  {monthNames.map((m, idx) => (
                    <MenuItem key={idx} value={idx}>{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <TextField
              label="Leave Days"
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              fullWidth
              size="small"
              InputProps={{ endAdornment: <InputAdornment position="end">days</InputAdornment> }}
            />
          </Box>
        </Card>
      </DialogContent>
      <DialogActions sx={{ p: 2, bgcolor: 'linear-gradient(135deg, #ede7f6 0%, #fff 100%)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
        <Button onClick={onClose} sx={{ fontWeight: 'bold', color: '#6A1B9A' }}>Cancel</Button>
        <Button onClick={onSave} disabled={!canSave} variant="contained" sx={{ bgcolor: '#6A1B9A', color: 'white', fontWeight: 'bold' }}>Add Leave</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeaveDialog;


