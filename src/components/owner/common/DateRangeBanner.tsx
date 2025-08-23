import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { DateRange } from '@mui/icons-material';

interface DateRangeBannerProps {
  label: string;
  color?: string;
  borderColor?: string;
  iconColor?: string;
  onDownloadClick?: () => void;
}

const DateRangeBanner: React.FC<DateRangeBannerProps> = ({
  label,
  color = '#6A1B9A',
  borderColor = '#6A1B9A',
  iconColor = '#6A1B9A',
  onDownloadClick,
}) => {
  return (
    <Box
      sx={{
        bgcolor: '#f8f9fa',
        p: 2,
        borderRadius: 1,
        borderLeft: `4px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DateRange sx={{ color: iconColor }} />
        <Typography variant="body2" sx={{ color, fontWeight: 'medium' }}>
          {label}
        </Typography>
      </Box>

      {onDownloadClick && (
        <Tooltip title="Download Beautiful HTML Report">
          <IconButton
            onClick={onDownloadClick}
            size="small"
            sx={{
              color,
              '&:hover': {
                bgcolor: 'rgba(106, 27, 154, 0.08)',
              },
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default DateRangeBanner;


