import React from 'react';
import { IconButton, CircularProgress } from '@mui/material';
import { Refresh } from '@mui/icons-material';

interface RefreshButtonProps {
  onClick?: () => void;
  refreshing?: boolean;
  disabled?: boolean;
  color?: string;
  hoverBg?: string;
  disabledColor?: string;
  size?: 'small' | 'medium' | 'large';
}

const RefreshButton: React.FC<RefreshButtonProps> = ({
  onClick,
  refreshing = false,
  disabled = false,
  color = '#6A1B9A',
  hoverBg = 'rgba(106, 27, 154, 0.08)',
  disabledColor = 'rgba(106, 27, 154, 0.5)',
  size = 'small',
}) => {
  return (
    <IconButton
      onClick={onClick}
      disabled={disabled}
      size={size}
      sx={{
        color,
        '&:hover': {
          bgcolor: hoverBg,
        },
        '&:disabled': {
          color: disabledColor,
        },
      }}
    >
      {refreshing ? (
        <CircularProgress size={18} sx={{ color }} />
      ) : (
        <Refresh fontSize={size === 'small' ? 'small' : 'inherit'} />
      )}
    </IconButton>
  );
};

export default RefreshButton;


