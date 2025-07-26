import React, { useState, useEffect } from 'react';
import {
  Alert,
  Chip,
  Badge,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Fade,
  Slide
} from '@mui/material';
import {
  CloudOff,
  Cloud,
  Sync,
  Warning,
  Info,
  CloudDone,
  WifiOff,
  Wifi
} from '@mui/icons-material';
import { offlineManager, NetworkStatus, OfflineBill } from '../utils/offlineManager';
import { formatCurrency, formatDate } from '../utils/helpers';

interface OfflineIndicatorProps {
  onSyncClick?: () => void;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onSyncClick }) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(offlineManager.getNetworkStatus());
  const [pendingData, setPendingData] = useState({ bills: 0 });
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [pendingBills, setPendingBills] = useState<OfflineBill[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Subscribe to network status changes
    const unsubscribe = offlineManager.onNetworkChange((status) => {
      setNetworkStatus(status);
    });

    // Update pending data count periodically
    const updatePendingData = () => {
      setPendingData(offlineManager.getPendingDataCount());
    };

    updatePendingData();
    const interval = setInterval(updatePendingData, 3000); // Update every 3 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleShowDetails = () => {
    setPendingBills(offlineManager.getPendingBills());
    setShowDetailsDialog(true);
  };

  const handleSync = async () => {
    if (!networkStatus.isOnline) {
      return;
    }

    setSyncing(true);
    try {
      // Call parent component's sync function if provided
      if (onSyncClick) {
        await onSyncClick();
      } else {
        // Otherwise use offline manager's basic sync
        await offlineManager.syncPendingData();
      }
      
      // Refresh data
      setPendingData(offlineManager.getPendingDataCount());
      setPendingBills(offlineManager.getPendingBills());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusInfo = () => {
    if (!networkStatus.isOnline) {
      return {
        color: '#FF6B6B',
        bgColor: 'rgba(255, 107, 107, 0.1)',
        icon: <WifiOff sx={{ fontSize: 16 }} />,
        text: 'Offline',
        description: 'Working offline'
      };
    }
    
    if (networkStatus.syncInProgress || syncing) {
      return {
        color: '#4ECDC4',
        bgColor: 'rgba(78, 205, 196, 0.1)',
        icon: <Sync sx={{ fontSize: 16, animation: 'spin 1s linear infinite' }} />,
        text: 'Syncing',
        description: 'Syncing data...'
      };
    }
    
    if (pendingData.bills > 0) {
      return {
        color: '#FFE066',
        bgColor: 'rgba(255, 224, 102, 0.1)',
        icon: <Cloud sx={{ fontSize: 16 }} />,
        text: `${pendingData.bills} pending`,
        description: `${pendingData.bills} bills waiting to sync`
      };
    }
    
    return {
      color: '#51CF66',
      bgColor: 'rgba(81, 207, 102, 0.1)',
      icon: <CloudDone sx={{ fontSize: 16 }} />,
      text: 'Online',
      description: 'All synced'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Minimalistic Network Status Pill */}
        <Fade in={true}>
          <Box
            onClick={pendingData.bills > 0 ? handleShowDetails : undefined}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1.5,
              py: 0.5,
              borderRadius: '20px',
              backgroundColor: statusInfo.bgColor,
              border: `1px solid ${statusInfo.color}30`,
              cursor: pendingData.bills > 0 ? 'pointer' : 'default',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(10px)',
              '&:hover': pendingData.bills > 0 ? {
                backgroundColor: statusInfo.bgColor,
                transform: 'translateY(-1px)',
                boxShadow: `0 4px 12px ${statusInfo.color}20`
              } : {},
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Subtle animated background for sync */}
            {(networkStatus.syncInProgress || syncing) && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(90deg, transparent, ${statusInfo.color}20, transparent)`,
                  animation: 'shimmer 2s infinite'
                }}
              />
            )}
            
            {/* Icon */}
            <Box sx={{ color: statusInfo.color, display: 'flex', alignItems: 'center' }}>
              {statusInfo.icon}
            </Box>
            
            {/* Status Text */}
            <Typography
              variant="caption"
              sx={{
                color: statusInfo.color,
                fontWeight: 600,
                fontSize: '0.75rem',
                letterSpacing: '0.02em'
              }}
            >
              {statusInfo.text}
            </Typography>
            
            {/* Pulse dot for active states */}
            {(networkStatus.syncInProgress || syncing || !networkStatus.isOnline) && (
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: statusInfo.color,
                  animation: 'pulse 2s infinite'
                }}
              />
            )}
          </Box>
        </Fade>

        {/* Floating Sync Button */}
        {networkStatus.isOnline && pendingData.bills > 0 && (
          <Slide direction="left" in={true}>
            <Tooltip title="Sync pending data" arrow>
              <IconButton
                size="small"
                onClick={handleSync}
                disabled={syncing}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  width: 32,
                  height: 32,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    transform: 'scale(1.1)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  },
                  '&:disabled': {
                    opacity: 0.6
                  }
                }}
              >
                <Badge 
                  badgeContent={pendingData.bills} 
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.6rem',
                      minWidth: 16,
                      height: 16,
                      borderRadius: '8px'
                    }
                  }}
                >
                  <Sync 
                    sx={{ 
                      fontSize: 16, 
                      color: 'white',
                      animation: syncing ? 'spin 1s linear infinite' : 'none'
                    }} 
                  />
                </Badge>
              </IconButton>
            </Tooltip>
          </Slide>
        )}
      </Box>

      {/* Elegant Pending Data Dialog */}
      <Dialog
        open={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                backgroundColor: '#FFE066',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Warning sx={{ color: '#F59E0B', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
                Pending Sync Data
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                {pendingBills.length} bills waiting to sync
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ px: 3 }}>
          {pendingBills.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              gap: 2, 
              py: 4,
              textAlign: 'center'
            }}>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: '#D1FAE5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CloudDone sx={{ color: '#059669', fontSize: 28 }} />
              </Box>
              <Typography variant="h6" sx={{ color: '#059669', fontWeight: 600 }}>
                All synced!
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                All your data is safely stored in the cloud
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {pendingBills.map((bill, index) => (
                <ListItem
                  key={bill.offlineId}
                  sx={{
                    mb: 1.5,
                    p: 0
                  }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      p: 2,
                      borderRadius: 2,
                      background: 'linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#cbd5e1',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1f2937' }}>
                          Bill #{bill.billNumber} • Table {bill.customer?.tableNumber}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
                          {bill.items.length} items • {bill.customerType} customer
                        </Typography>
                      </Box>
                      <Typography variant="h6" sx={{ color: '#059669', fontWeight: 700 }}>
                        {formatCurrency(bill.totalAmount)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        Created: {formatDate(bill.createdAt)}
                      </Typography>
                      {bill.syncAttempts > 0 && (
                        <Chip
                          label={`${bill.syncAttempts} retry${bill.syncAttempts > 1 ? 'ies' : ''}`}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}

          {syncing && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, color: '#4ECDC4', fontWeight: 500 }}>
                Syncing data to cloud...
              </Typography>
              <LinearProgress 
                sx={{ 
                  borderRadius: 1,
                  height: 6,
                  backgroundColor: 'rgba(78, 205, 196, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#4ECDC4'
                  }
                }} 
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setShowDetailsDialog(false)}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Close
          </Button>
          {networkStatus.isOnline && pendingBills.length > 0 && (
            <Button
              onClick={handleSync}
              disabled={syncing}
              variant="contained"
              startIcon={<Sync />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                background: 'linear-gradient(145deg, #4ECDC4 0%, #44B3AC 100%)',
                boxShadow: '0 4px 12px rgba(78, 205, 196, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(145deg, #44B3AC 0%, #3A9B95 100%)',
                  boxShadow: '0 6px 16px rgba(78, 205, 196, 0.4)'
                }
              }}
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Custom CSS Animations */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
          }
        `}
      </style>
    </>
  );
};

export default OfflineIndicator; 