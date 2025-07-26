import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Tooltip,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  CircularProgress,
  Alert,
  Divider,
  Stack,
  Badge
} from '@mui/material';
import {
  Print,
  PrintDisabled,
  Refresh,
  CheckCircle,
  Error,
  Warning,
  Computer,
  AutoAwesome,
  Bolt,
  Settings,
  Wifi,
  Usb,
  Receipt,
  Speed
} from '@mui/icons-material';

interface PrinterInfo {
  name: string;
  status: string;
  isDefault: boolean;
  isThermal?: boolean;
  priority?: number;
  port?: string;
  connectionType?: string;
  description?: string;
  location?: string;
}

interface RecommendedPrinter {
  name: string;
  isThermal: boolean;
  priority: number;
}

interface PrinterConnectivity {
  isConnected: boolean;
  printerCount: number;
  printers: PrinterInfo[];
  recommendedPrinter?: RecommendedPrinter | null;
}

interface PrinterConnectivityProps {
  onStatusChange?: (isConnected: boolean) => void;
  onPrinterSelected?: (printer: PrinterInfo) => void;
}

const PrinterConnectivity: React.FC<PrinterConnectivityProps> = ({ 
  onStatusChange, 
  onPrinterSelected 
}) => {
  const [printerStatus, setPrinterStatus] = useState<PrinterConnectivity>({
    isConnected: false,
    printerCount: 0,
    printers: []
  });
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoConnecting, setAutoConnecting] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterInfo | null>(null);
  const [testingPrinter, setTestingPrinter] = useState<string | null>(null);

  // Check if Electron API is available
  const checkApiAvailability = useCallback(() => {
    const isAvailable = !!(window.electronAPI?.checkPrinterConnectivity);
    setApiAvailable(isAvailable);
    console.log('PrinterConnectivity: API available?', isAvailable);
    return isAvailable;
  }, []);

  // Check printer connectivity
  const checkPrinterConnectivity = useCallback(async () => {
    console.log('PrinterConnectivity: Checking printer connectivity...');
    
    if (!checkApiAvailability()) {
      console.log('PrinterConnectivity: API not available, skipping check');
      setError('Electron API not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('PrinterConnectivity: Calling checkPrinterConnectivity API...');
      
      const electronAPI = window.electronAPI;
      if (!electronAPI?.checkPrinterConnectivity) {
        setError('Printer connectivity API not available');
        setLoading(false);
        return;
      }
      
      const connectivity = await electronAPI.checkPrinterConnectivity();
      console.log('PrinterConnectivity: API response:', connectivity);
      
      setPrinterStatus(connectivity);
      setLastChecked(new Date());
      
      // Auto-select recommended printer if available
      if (connectivity.recommendedPrinter && !selectedPrinter) {
        const recommended = connectivity.printers.find(
          p => p.name === connectivity.recommendedPrinter?.name
        );
        if (recommended) {
          setSelectedPrinter(recommended);
          onPrinterSelected?.(recommended);
        }
      }
      
      // Notify parent component if callback provided
      if (onStatusChange) {
        onStatusChange(connectivity.isConnected);
      }
      
      console.log('PrinterConnectivity: Status updated successfully');
    } catch (error: unknown) {
      console.error('PrinterConnectivity: Failed to check printer connectivity:', error);
      let errorMessage = 'Unknown error';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      setError(errorMessage);
      setPrinterStatus({
        isConnected: false,
        printerCount: 0,
        printers: []
      });
    } finally {
      setLoading(false);
    }
  }, [checkApiAvailability, onStatusChange, onPrinterSelected, selectedPrinter]);

  // Auto-connect to recommended printer
  const autoConnectPrinter = useCallback(async () => {
    if (!window.electronAPI?.autoConnectPrinter) {
      setError('Auto-connect API not available');
      return;
    }

    try {
      setAutoConnecting(true);
      setError(null);
      
      const result = await window.electronAPI.autoConnectPrinter();
      
      if (result.success && result.printer) {
        // Find the full printer info
        const fullPrinter = printerStatus.printers.find(p => p.name === result.printer?.name);
        if (fullPrinter) {
          setSelectedPrinter(fullPrinter);
          onPrinterSelected?.(fullPrinter);
        }
        
        // Refresh printer status
        await checkPrinterConnectivity();
      } else {
        setError(result.error || 'Auto-connect failed');
      }
    } catch (error: unknown) {
      console.error('Auto-connect failed:', error);
      setError('Auto-connect failed');
    } finally {
      setAutoConnecting(false);
    }
  }, [printerStatus.printers, onPrinterSelected, checkPrinterConnectivity]);

  // Test printer connection
  const testPrinter = useCallback(async (printerName: string) => {
    if (!window.electronAPI?.testPrinter) {
      setError('Test printer API not available');
      return;
    }

    try {
      setTestingPrinter(printerName);
      setError(null);
      
      const result = await window.electronAPI.testPrinter(printerName);
      
      if (!result.success) {
        setError(result.error || 'Printer test failed');
      }
    } catch (error: unknown) {
      console.error('Printer test failed:', error);
      setError('Printer test failed');
    } finally {
      setTestingPrinter(null);
    }
  }, []);

  // Select printer manually
  const selectPrinter = useCallback((printer: PrinterInfo) => {
    setSelectedPrinter(printer);
    onPrinterSelected?.(printer);
  }, [onPrinterSelected]);

  // Initial check and periodic checks
  useEffect(() => {
    console.log('PrinterConnectivity: Component mounted, starting checks...');
    
    // Initial API availability check
    if (!checkApiAvailability()) {
      console.log('PrinterConnectivity: API not available on mount, will retry...');
      // Retry after a short delay in case the API is still loading
      const retryTimer = setTimeout(() => {
        console.log('PrinterConnectivity: Retrying API availability check...');
        if (checkApiAvailability()) {
          checkPrinterConnectivity();
        }
      }, 2000);
      
      return () => clearTimeout(retryTimer);
    }
    
    // If API is available, start checking immediately
    checkPrinterConnectivity();

    // Check every 30 seconds
    const interval = setInterval(() => {
      if (apiAvailable) {
        checkPrinterConnectivity();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [checkApiAvailability, checkPrinterConnectivity, apiAvailable]);

  // Format printer status for display
  const getPrinterStatusIcon = (printer: PrinterInfo) => {
    switch (printer.status) {
      case 'idle':
        return <CheckCircle color="success" />;
      case 'printing':
        return <CircularProgress size={20} />;
      case 'paused':
        return <Warning color="warning" />;
      case 'error':
        return <Error color="error" />;
      default:
        return <CheckCircle color="success" />;
    }
  };

  // Get connection type icon
  const getConnectionTypeIcon = (connectionType?: string) => {
    switch (connectionType?.toLowerCase()) {
      case 'usb':
        return <Usb fontSize="small" />;
      case 'network':
      case 'wifi':
        return <Wifi fontSize="small" />;
      default:
        return <Settings fontSize="small" />;
    }
  };

  // Get overall status display
  const getStatusDisplay = () => {
    if (!apiAvailable) {
      return {
        icon: <Computer />,
        text: 'Desktop only',
        color: 'default' as const,
        bgColor: 'rgba(255, 255, 255, 0.1)'
      };
    }
    
    if (loading) {
      return {
        icon: <CircularProgress size={16} color="inherit" />,
        text: 'Checking...',
        color: 'default' as const,
        bgColor: 'rgba(255, 255, 255, 0.1)'
      };
    }

    if (error) {
      return {
        icon: <Error />,
        text: 'Check failed',
        color: 'warning' as const,
        bgColor: 'rgba(255, 193, 7, 0.1)'
      };
    }

    if (printerStatus.isConnected) {
      const thermalCount = printerStatus.printers.filter(p => p.isThermal).length;
      const hasThermal = thermalCount > 0;
      
      return {
        icon: hasThermal ? <Receipt /> : <Print />,
        text: `${printerStatus.printerCount} printer${printerStatus.printerCount !== 1 ? 's' : ''}${hasThermal ? ` (${thermalCount} thermal)` : ''}`,
        color: 'success' as const,
        bgColor: hasThermal ? 'rgba(76, 175, 80, 0.15)' : 'rgba(46, 125, 50, 0.1)'
      };
    }

    return {
      icon: <PrintDisabled />,
      text: 'No printers',
      color: 'error' as const,
      bgColor: 'rgba(211, 47, 47, 0.1)'
    };
  };

  const statusDisplay = getStatusDisplay();

  // Get tooltip text
  const getTooltipText = () => {
    if (!apiAvailable) {
      return 'Printer connectivity check is only available in desktop mode';
    }
    
    if (loading) {
      return 'Checking printer connectivity...';
    }
    
    if (error) {
      return `Printer check failed: ${error}`;
    }
    
    if (printerStatus.isConnected) {
      const thermalCount = printerStatus.printers.filter(p => p.isThermal).length;
      const hasThermal = thermalCount > 0;
      const thermalText = hasThermal ? ` (${thermalCount} thermal printers available)` : '';
      return `${printerStatus.printerCount} printer${printerStatus.printerCount !== 1 ? 's' : ''} connected${thermalText}${lastChecked ? ` (Last checked: ${lastChecked.toLocaleTimeString()})` : ''}`;
    }
    
    return `No printers connected${lastChecked ? ` (Last checked: ${lastChecked.toLocaleTimeString()})` : ''}`;
  };

  return (
    <>
      <Tooltip title={getTooltipText()} arrow>
        <Box
          onClick={() => setShowDetails(true)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            padding: '4px 8px',
            borderRadius: '16px',
            backgroundColor: statusDisplay.bgColor,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              opacity: 0.8,
              backgroundColor: !apiAvailable ? 'rgba(255, 255, 255, 0.15)' :
                loading ? 'rgba(255, 255, 255, 0.15)' : 
                error ? 'rgba(255, 193, 7, 0.15)' :
                printerStatus.isConnected ? 'rgba(46, 125, 50, 0.15)' : 'rgba(211, 47, 47, 0.15)'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
            {statusDisplay.icon}
          </Box>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'white',
              fontWeight: 500,
              fontSize: '0.75rem',
              lineHeight: 1
            }}
          >
            {statusDisplay.text}
          </Typography>
        </Box>
      </Tooltip>

      {/* Printer Details Dialog */}
      <Dialog 
        open={showDetails} 
        onClose={() => setShowDetails(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Print />
          Enhanced Printer Management
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            onClick={checkPrinterConnectivity}
            disabled={loading || !apiAvailable}
            size="small"
            sx={{ ml: 1 }}
          >
            <Refresh />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          {!apiAvailable ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Computer sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Desktop Mode Required
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Printer connectivity check is only available when running as a desktop application
              </Typography>
            </Box>
          ) : (
            <>
              {/* Status Summary */}
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Status: {error ? (
                      <Chip label={`Error: ${error}`} color="error" size="small" />
                    ) : printerStatus.isConnected ? 
                      <Chip label="Connected" color="success" size="small" /> : 
                      <Chip label="Disconnected" color="error" size="small" />
                    }
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total: {printerStatus.printerCount}
                  </Typography>
                  {printerStatus.printers.filter(p => p.isThermal).length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Thermal: {printerStatus.printers.filter(p => p.isThermal).length}
                    </Typography>
                  )}
                </Stack>
                
                {lastChecked && (
                  <Typography variant="caption" color="text.secondary">
                    Last Checked: {lastChecked.toLocaleString()}
                  </Typography>
                )}
              </Box>

              {/* Auto-Connect Section */}
              {printerStatus.recommendedPrinter && (
                <Alert 
                  severity="info" 
                  sx={{ mb: 2 }}
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={autoConnectPrinter}
                      disabled={autoConnecting}
                      startIcon={autoConnecting ? <CircularProgress size={16} /> : <AutoAwesome />}
                    >
                      {autoConnecting ? 'Connecting...' : 'Auto-Connect'}
                    </Button>
                  }
                >
                  <Typography variant="body2">
                    <strong>Recommended Printer:</strong> {printerStatus.recommendedPrinter.name}
                    {printerStatus.recommendedPrinter.isThermal && (
                      <Chip 
                        label="Thermal" 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Typography>
                </Alert>
              )}

              {/* Error Display */}
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {error ? (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Error sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
                  <Typography variant="body2" color="error.main">
                    Failed to check printer connectivity
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {error}
                  </Typography>
                </Box>
              ) : printerStatus.printers.length > 0 ? (
                <List dense>
                  {printerStatus.printers.map((printer, index) => (
                    <ListItem 
                      key={index} 
                      divider
                      sx={{
                        backgroundColor: selectedPrinter?.name === printer.name ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                        borderRadius: 1,
                        mb: 0.5,
                        border: selectedPrinter?.name === printer.name ? '2px solid #4CAF50' : '1px solid transparent'
                      }}
                    >
                      <ListItemButton
                        onClick={() => selectPrinter(printer)}
                        sx={{ borderRadius: 1 }}
                      >
                      <ListItemIcon>
                        <Badge
                          badgeContent={printer.priority}
                          color={printer.isThermal ? "primary" : "default"}
                          max={3}
                        >
                          {getPrinterStatusIcon(printer)}
                        </Badge>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" fontWeight="medium">
                              {printer.name}
                            </Typography>
                            {printer.isThermal && (
                              <Chip 
                                label="Thermal" 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                                icon={<Receipt />}
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                            {printer.isDefault && (
                              <Chip 
                                label="Default" 
                                size="small" 
                                color="secondary" 
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                            {printer.connectionType && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {getConnectionTypeIcon(printer.connectionType)}
                                <Typography variant="caption" color="text.secondary">
                                  {printer.connectionType}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Status: {printer.status.charAt(0).toUpperCase() + printer.status.slice(1)}
                            </Typography>
                            {printer.port && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Port: {printer.port}
                              </Typography>
                            )}
                            {printer.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {printer.description}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Test printer connection">
                            <span>
                              <IconButton
                                size="small"
                                onClick={e => {
                                  e.stopPropagation();
                                  testPrinter(printer.name);
                                }}
                                disabled={testingPrinter === printer.name}
                              >
                                {testingPrinter === printer.name ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <Speed />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <PrintDisabled sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No printers detected
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Please ensure your printer is connected and turned on
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        
        <DialogActions>
          {printerStatus.recommendedPrinter && (
            <Button
              onClick={autoConnectPrinter}
              disabled={autoConnecting || !apiAvailable}
              startIcon={autoConnecting ? <CircularProgress size={16} /> : <AutoAwesome />}
              color="primary"
              variant="outlined"
            >
              {autoConnecting ? 'Connecting...' : 'Auto-Connect'}
            </Button>
          )}
          <Button 
            onClick={checkPrinterConnectivity} 
            disabled={loading || !apiAvailable}
          >
            Refresh
          </Button>
          <Button onClick={() => setShowDetails(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PrinterConnectivity; 