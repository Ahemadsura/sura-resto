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
  const [printTesting, setPrintTesting] = useState(false);
  const [showPrintTestDialog, setShowPrintTestDialog] = useState(false);

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

  // Print test bill
  const printTestBill = useCallback(async () => {
    if (!selectedPrinter) {
      setError('Please select a printer first');
      return;
    }

    try {
      setPrintTesting(true);
      setError(null);
      
      // Create a simple test bill content
      const testBillContent = `
        ========================================
                    TEST BILL
        ========================================
        
        Date: ${new Date().toLocaleDateString()}
        Time: ${new Date().toLocaleTimeString()}
        
        This is a test print to verify
        that your printer is working correctly.
        
        Printer: ${selectedPrinter.name}
        Status: ${selectedPrinter.status}
        Type: ${selectedPrinter.isThermal ? 'Thermal' : 'Regular'}
        
        ========================================
                    END OF TEST
        ========================================
      `;

      // Use the print API to print the test content
      if (window.electronAPI?.print) {
        // Create a temporary print container
        const printContainer = document.createElement('div');
        printContainer.id = 'print-test-container';
        printContainer.innerHTML = `
          <div style="
            font-family: monospace;
            font-size: 12px;
            line-height: 1.2;
            padding: 20px;
            background: white;
            color: black;
            white-space: pre-line;
            max-width: 300px;
            margin: 0 auto;
          ">
            ${testBillContent}
          </div>
        `;
        
        // Hide the container initially
        printContainer.style.position = 'absolute';
        printContainer.style.left = '-9999px';
        printContainer.style.top = '0';
        
        document.body.appendChild(printContainer);
        
        // Trigger print
        await window.electronAPI.print();
        
        // Remove the container after printing
        setTimeout(() => {
          const container = document.getElementById('print-test-container');
          if (container) {
            document.body.removeChild(container);
          }
        }, 2000);
        
        setShowPrintTestDialog(false);
      } else {
        setError('Print API not available');
      }
    } catch (error: unknown) {
      console.error('Print test failed:', error);
      setError('Print test failed');
    } finally {
      setPrintTesting(false);
    }
  }, [selectedPrinter]);

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
            gap: 1,
            padding: '8px 16px',
            borderRadius: '25px',
            background: printerStatus.isConnected 
              ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'
              : error 
                ? 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)'
                : loading
                  ? 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)'
                  : 'linear-gradient(135deg, #757575 0%, #616161 100%)',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            border: '1px solid rgba(255,255,255,0.1)',
            minWidth: '140px',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              transition: 'left 0.5s',
            },
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              '&::before': {
                left: '100%',
              }
            },
            '&:active': {
              transform: 'translateY(0px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            fontSize: '16px',
            color: 'white',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
          }}>
            {statusDisplay.icon}
          </Box>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'white',
              fontWeight: 600,
              fontSize: '0.8rem',
              lineHeight: 1,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              letterSpacing: '0.5px'
            }}
          >
            {statusDisplay.text}
          </Typography>
          {lastChecked && (
            <Box sx={{ 
              position: 'absolute', 
              top: '-8px', 
              right: '-8px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: printerStatus.isConnected ? '#4CAF50' : '#f44336',
              border: '2px solid white',
              boxShadow: '0 0 0 2px rgba(0,0,0,0.1)'
            }} />
          )}
        </Box>
      </Tooltip>

      {/* Printer Details Dialog */}
      <Dialog 
        open={showDetails} 
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            border: '1px solid rgba(255,255,255,0.2)'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          background: 'linear-gradient(135deg, #7B2CBF 0%, #9B4DDB 100%)',
          color: 'white',
          borderRadius: '16px 16px 0 0',
          padding: '20px 24px',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.3
          }
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            position: 'relative',
            zIndex: 1
          }}>
            <Box sx={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Print sx={{ fontSize: 24, color: 'white' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: '0.5px' }}>
              Enhanced Printer Management
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
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
              <Box sx={{ 
                mb: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{
                    background: printerStatus.isConnected 
                      ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'
                      : error 
                        ? 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)'
                        : 'linear-gradient(135deg, #757575 0%, #616161 100%)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}>
                    {printerStatus.isConnected ? <CheckCircle /> : error ? <Error /> : <PrintDisabled />}
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {error ? 'Connection Error' : printerStatus.isConnected ? 'Connected' : 'Disconnected'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {error ? error : printerStatus.isConnected ? `${printerStatus.printerCount} printer${printerStatus.printerCount !== 1 ? 's' : ''} available` : 'No printers detected'}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`Total: ${printerStatus.printerCount}`}
                    color="primary"
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  {printerStatus.printers.filter(p => p.isThermal).length > 0 && (
                    <Chip 
                      label={`Thermal: ${printerStatus.printers.filter(p => p.isThermal).length}`}
                      color="secondary"
                      variant="outlined"
                      size="small"
                      icon={<Receipt />}
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                  {lastChecked && (
                    <Chip 
                      label={`Updated: ${lastChecked.toLocaleTimeString()}`}
                      color="default"
                      variant="outlined"
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  )}
                </Box>
              </Box>

              {/* Auto-Connect Section */}
              {printerStatus.recommendedPrinter && (
                <Box sx={{ 
                  mb: 3,
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid #2196f3',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    right: 0, 
                    width: '60px', 
                    height: '60px',
                    background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                    borderRadius: '0 12px 0 60px',
                    opacity: 0.1
                  }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{
                        background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)'
                      }}>
                        <AutoAwesome />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                          Recommended Printer
                        </Typography>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {printerStatus.recommendedPrinter.name}
                          {printerStatus.recommendedPrinter.isThermal && (
                            <Chip 
                              label="Thermal" 
                              size="small" 
                              color="primary" 
                              variant="filled"
                              sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                            />
                          )}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={autoConnectPrinter}
                      disabled={autoConnecting}
                      startIcon={autoConnecting ? <CircularProgress size={16} /> : <AutoAwesome />}
                      sx={{
                        background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                        boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                          boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)',
                        }
                      }}
                    >
                      {autoConnecting ? 'Connecting...' : 'Auto-Connect'}
                    </Button>
                  </Box>
                </Box>
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
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#333' }}>
                    Available Printers ({printerStatus.printers.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {printerStatus.printers.map((printer, index) => (
                      <Box
                        key={index}
                        sx={{
                          background: selectedPrinter?.name === printer.name 
                            ? 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)'
                            : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                          borderRadius: '12px',
                          padding: '16px',
                          border: selectedPrinter?.name === printer.name 
                            ? '2px solid #4CAF50'
                            : '1px solid rgba(0,0,0,0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: selectedPrinter?.name === printer.name 
                            ? '0 4px 12px rgba(76, 175, 80, 0.2)'
                            : '0 2px 8px rgba(0,0,0,0.06)',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                            border: '1px solid #2196f3'
                          },
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onClick={() => selectPrinter(printer)}
                      >
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{
                            background: printer.isThermal 
                              ? 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)'
                              : 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                            borderRadius: '50%',
                            width: '48px',
                            height: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            position: 'relative'
                          }}>
                            {getPrinterStatusIcon(printer)}
                            {printer.priority && (
                              <Box sx={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                background: '#ff5722',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                color: 'white',
                                border: '2px solid white'
                              }}>
                                {printer.priority}
                              </Box>
                            )}
                          </Box>
                          
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#333' }}>
                                {printer.name}
                              </Typography>
                              {printer.isThermal && (
                                <Chip 
                                  label="Thermal" 
                                  size="small" 
                                  color="warning" 
                                  variant="filled"
                                  icon={<Receipt />}
                                  sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                                />
                              )}
                              {printer.isDefault && (
                                <Chip 
                                  label="Default" 
                                  size="small" 
                                  color="secondary" 
                                  variant="filled"
                                  sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                                />
                              )}
                              {printer.connectionType && (
                                <Chip 
                                  label={printer.connectionType}
                                  size="small" 
                                  color="info" 
                                  variant="outlined"
                                  icon={getConnectionTypeIcon(printer.connectionType)}
                                  sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                                />
                              )}
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                              <Typography variant="caption" sx={{ 
                                color: printer.status === 'idle' ? '#4CAF50' : '#f44336',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5
                              }}>
                                <Box sx={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: printer.status === 'idle' ? '#4CAF50' : '#f44336'
                                }} />
                                {printer.status.charAt(0).toUpperCase() + printer.status.slice(1)}
                              </Typography>
                              {printer.port && (
                                <Typography variant="caption" color="text.secondary">
                                  Port: {printer.port}
                                </Typography>
                              )}
                            </Box>
                            
                            {printer.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {printer.description}
                              </Typography>
                            )}
                          </Box>
                          
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
                                  sx={{
                                    background: 'rgba(33, 150, 243, 0.1)',
                                    color: '#2196f3',
                                    '&:hover': {
                                      background: 'rgba(33, 150, 243, 0.2)',
                                    }
                                  }}
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
                                                </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
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
        
        <DialogActions sx={{ 
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderRadius: '0 0 16px 16px',
          borderTop: '1px solid rgba(0,0,0,0.08)'
        }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {selectedPrinter && (
              <Button
                onClick={() => setShowPrintTestDialog(true)}
                disabled={printTesting || !apiAvailable}
                startIcon={printTesting ? <CircularProgress size={16} /> : <Print />}
                variant="contained"
                sx={{
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)',
                    boxShadow: '0 4px 12px rgba(255, 152, 0, 0.4)',
                  }
                }}
              >
                {printTesting ? 'Printing...' : 'Print Test'}
              </Button>
            )}
            {printerStatus.recommendedPrinter && (
              <Button
                onClick={autoConnectPrinter}
                disabled={autoConnecting || !apiAvailable}
                startIcon={autoConnecting ? <CircularProgress size={16} /> : <AutoAwesome />}
                variant="contained"
                sx={{
                  background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                  boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)',
                  }
                }}
              >
                {autoConnecting ? 'Connecting...' : 'Auto-Connect'}
              </Button>
            )}
            <Button 
              onClick={checkPrinterConnectivity} 
              disabled={loading || !apiAvailable}
              variant="outlined"
              sx={{
                borderColor: '#2196f3',
                color: '#2196f3',
                '&:hover': {
                  borderColor: '#1976d2',
                  backgroundColor: 'rgba(33, 150, 243, 0.04)',
                }
              }}
            >
              Refresh
            </Button>
            <Button 
              onClick={() => setShowDetails(false)} 
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #7B2CBF 0%, #9B4DDB 100%)',
                boxShadow: '0 2px 8px rgba(123, 44, 191, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #9B4DDB 0%, #AB5DE5 100%)',
                  boxShadow: '0 4px 12px rgba(123, 44, 191, 0.4)',
                }
              }}
            >
              Close
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Print Test Dialog */}
      <Dialog 
        open={showPrintTestDialog} 
        onClose={() => setShowPrintTestDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Print />
          Print Test Bill
        </DialogTitle>
        
        <DialogContent>
          {selectedPrinter ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  This will print a test bill to verify that <strong>{selectedPrinter.name}</strong> is working correctly.
                </Typography>
              </Alert>
              
              <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Test Bill Preview:
                </Typography>
                <Box sx={{ 
                  bgcolor: 'white', 
                  p: 2, 
                  borderRadius: 1, 
                  border: '1px solid #ddd',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  whiteSpace: 'pre-line'
                }}>
{`========================================
                    TEST BILL
========================================

Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}

This is a test print to verify
that your printer is working correctly.

Printer: ${selectedPrinter.name}
Status: ${selectedPrinter.status}
Type: ${selectedPrinter.isThermal ? 'Thermal' : 'Regular'}

========================================
                    END OF TEST
========================================`}
                </Box>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                Click "Print Test" to send this test bill to your selected printer.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Error sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
              <Typography variant="body2" color="error.main">
                No printer selected
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Please select a printer first
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setShowPrintTestDialog(false)}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={printTestBill}
            disabled={!selectedPrinter || printTesting}
            variant="contained"
            startIcon={printTesting ? <CircularProgress size={16} /> : <Print />}
          >
            {printTesting ? 'Printing...' : 'Print Test'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PrinterConnectivity; 