import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';

interface PaginationControlsProps {
  page: number;
  setPage: (updater: (prev: number) => number) => void;
  maxPage: number;
  color?: string;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  setPage,
  maxPage,
  color = '#6A1B9A',
}) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
      <IconButton onClick={() => setPage((prev) => Math.max(prev - 1, 0))} disabled={page === 0}>
        <span style={{ fontSize: 28 }}>⬅️</span>
      </IconButton>
      <Typography sx={{ mx: 2, fontWeight: 'bold', color }}>
        Page {page + 1} of {maxPage + 1}
      </Typography>
      <IconButton onClick={() => setPage((prev) => Math.min(prev + 1, maxPage))} disabled={page >= maxPage}>
        <span style={{ fontSize: 28 }}>➡️</span>
      </IconButton>
    </Box>
  );
};

export default PaginationControls;


