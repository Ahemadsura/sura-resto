import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  Chip
} from '@mui/material';
import { TableRestaurant } from '@mui/icons-material';
import { RunningTable } from './types';

interface RunningTablesPanelProps {
  runningTables: RunningTable[];
  selectedTable: RunningTable | null;
  onSelectTable: (table: RunningTable) => void;
}

const RunningTablesPanel: React.FC<RunningTablesPanelProps> = ({
  runningTables,
  selectedTable,
  onSelectTable
}) => {
  return (
    <Paper sx={{ 
      flex: '0 0 180px', 
      p: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      overflow: 'auto', 
      minHeight: 0 
    }}>
      <Typography variant="subtitle1" sx={{ mb: 1, fontSize: '0.9rem' }}>
        <TableRestaurant sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: '1.1rem' }} />
        Tables ({runningTables.length})
      </Typography>
      
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List dense>
          {runningTables.map((table, index) => (
            <ListItemButton
              key={`table-${table.tableNumber}-${index}`}
              onClick={(e) => {
                e.preventDefault();
                onSelectTable(table);
              }}
              selected={selectedTable?.tableNumber === table.tableNumber}
              sx={{ py: 0.5, px: 1, borderRadius: 1, mb: 0.5 }}
            >
              <ListItemText
                primary={`Table ${table.tableNumber}`}
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip 
                      label={table.customerType[0].toUpperCase()} 
                      size="small" 
                      color={table.customerType === 'private' ? 'primary' : 'warning'}
                      sx={{ height: 16, fontSize: '0.65rem' }}
                    />
                    <Typography variant="caption">
                      {table.items.length} items
                    </Typography>
                  </Box>
                }
                primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Paper>
  );
};

export default RunningTablesPanel; 