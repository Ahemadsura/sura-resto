import React from 'react';
import { Box, Typography, Button, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { DateRange, Refresh } from '@mui/icons-material';
import RefreshButton from "../common/RefreshButton";

type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom' | 'customYear' | 'customDay' | 'customRange';

interface DateFilterProps {
  dateFilter: DateFilterType;
  setDateFilter: (filter: DateFilterType) => void;
  onCustomDateClick: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  dateRangeLabel: string;
  onDownloadClick?: () => void;
}

const DateFilter: React.FC<DateFilterProps> = ({
  dateFilter,
  setDateFilter,
  onCustomDateClick,
  onRefresh,
  refreshing,
  dateRangeLabel,
  onDownloadClick
}) => {
  const filterOptions = [
    { value: 'today', label: 'Today', icon: '📅' },
    { value: 'yesterday', label: 'Yesterday', icon: '🕒' },
    { value: 'week', label: 'Week', icon: '📊' },
    { value: 'month', label: 'Month', icon: '📈' },
    { value: 'year', label: 'Year', icon: '📋' }
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ color: '#6A1B9A', fontWeight: 'bold' }}>
          💰 Revenue Analytics
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          alignItems: 'center',
          bgcolor: 'white',
          p: 1,
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(106, 27, 154, 0.1)',
          border: '1px solid rgba(106, 27, 154, 0.1)'
        }}>
          <Typography variant="body2" sx={{ 
            color: '#6b7280', 
            fontWeight: 500,
            mr: 1,
            fontSize: '0.875rem'
          }}>
            Time Period
          </Typography>
          
          {filterOptions.map((filter) => (
            <Button 
              key={filter.value}
              onClick={() => setDateFilter(filter.value as DateFilterType)}
              variant={dateFilter === filter.value ? 'contained' : 'text'}
              size="small"
              sx={{
                minWidth: 'auto',
                px: 2,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: dateFilter === filter.value ? 600 : 500,
                fontSize: '0.875rem',
                color: dateFilter === filter.value ? 'white' : '#6b7280',
                bgcolor: dateFilter === filter.value ? '#6A1B9A' : 'transparent',
                boxShadow: dateFilter === filter.value ? '0 2px 8px rgba(106, 27, 154, 0.3)' : 'none',
                '&:hover': {
                  bgcolor: dateFilter === filter.value ? '#5a1a8a' : 'rgba(107, 114, 128, 0.08)',
                  boxShadow: dateFilter === filter.value ? '0 4px 12px rgba(106, 27, 154, 0.4)' : 'none'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <Box component="span" sx={{ mr: 0.5 }}>{filter.icon}</Box>
              {filter.label}
            </Button>
          ))}
          
          <Button 
            onClick={onCustomDateClick}
            startIcon={<DateRange />}
            size="small"
            sx={{ 
              minWidth: 'auto',
              px: 2,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: '#6A1B9A',
              bgcolor: 'rgba(106, 27, 154, 0.08)',
              border: '1px solid rgba(106, 27, 154, 0.2)',
              '&:hover': {
                bgcolor: 'rgba(106, 27, 154, 0.12)',
                borderColor: '#6A1B9A'
              },
              transition: 'all 0.2s ease'
            }}
          >
            Custom
          </Button>
        </Box>
        
        <RefreshButton onClick={onRefresh} refreshing={refreshing} />
      </Box>

      <Box sx={{ 
        bgcolor: '#f8f9fa', 
        p: 2, 
        borderRadius: 1, 
        borderLeft: '4px solid #6A1B9A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DateRange sx={{ color: '#6A1B9A' }} />
          <Typography variant="body2" sx={{ color: '#6A1B9A', fontWeight: 'medium' }}>
            {dateRangeLabel}
          </Typography>
        </Box>
        
        {onDownloadClick && (
          <Tooltip title="Download Beautiful HTML Report">
            <IconButton
              onClick={onDownloadClick}
              size="small"
              sx={{
                color: '#6A1B9A',
                '&:hover': {
                  bgcolor: 'rgba(106, 27, 154, 0.08)'
                }
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default DateFilter; 