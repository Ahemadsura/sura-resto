const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const https = require('https');
const log = require('electron-log');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');

// Add dotenv support for environment variables
require('dotenv').config();

// Initialize persistent store
const store = new Store();

// Configure logging
log.transports.file.level = 'info';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
log.transports.console.level = 'info';

// Log app startup
log.info('🚀 SURA-RESTO by SURA - App Starting', {
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  timestamp: new Date().toISOString()
});

const VITE_DIST_PATH = path.join(__dirname, 'build', 'index.html');
const VERSION_URL = process.env.REACT_APP_UPDATE_SERVER_URL || null;

let mainWindow;
let networkStatus = { isOnline: true };

// Enhanced error handling
process.on('uncaughtException', (error) => {
  log.error('💥 Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('🚫 Unhandled Rejection:', {
    reason: reason,
    promise: promise,
    timestamp: new Date().toISOString()
  });
  console.error('🚫 Unhandled Rejection:', reason);
});

function createWindow() {
  log.info('🪟 Creating main window');
  console.log('🪟 Creating main window');
  
  // Check if build file exists
  const fs = require('fs');
  if (!fs.existsSync(VITE_DIST_PATH)) {
    console.error('❌ Build file not found:', VITE_DIST_PATH);
    log.error('❌ Build file not found:', VITE_DIST_PATH);
    
    // Show error dialog
    const { dialog } = require('electron');
    dialog.showErrorBox('Build Error', 
      `Build file not found: ${VITE_DIST_PATH}\n\nPlease run: npm run build`);
    return;
  }
  
  console.log('✅ Build file found:', VITE_DIST_PATH);
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webSecurity: true,
      preload: path.join(__dirname, 'src/preload.js'),
    },
    autoHideMenuBar: true,
    show: false, // Don't show until ready-to-show
  });

  // Enhanced debugging
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ Failed to load:', {
      errorCode,
      errorDescription,
      validatedURL
    });
    log.error('❌ Failed to load:', { errorCode, errorDescription, validatedURL });
  });

  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('💥 Renderer crashed:', killed);
    log.error('💥 Renderer crashed:', killed);
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.error('⏳ Renderer became unresponsive');
    log.error('⏳ Renderer became unresponsive');
  });

  mainWindow.webContents.on('responsive', () => {
    console.log('✅ Renderer became responsive again');
    log.info('✅ Renderer became responsive again');
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    console.log('✅ Window ready to show');
    mainWindow.show();
    log.info('🪟 Main window shown');
  });

  // Open DevTools for debugging
  mainWindow.webContents.openDevTools();

  // Security: Prevent new window creation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    log.warn('🚨 Blocked attempt to open new window:', url);
    return { action: 'deny' };
  });

  // Security: Handle navigation attempts
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Allow navigation to the same origin
    if (parsedUrl.origin !== 'file://') {
      log.warn('🚨 Blocked navigation attempt:', navigationUrl);
      event.preventDefault();
    }
  });

  console.log('📂 Loading file:', VITE_DIST_PATH);
  mainWindow.loadFile(VITE_DIST_PATH);

  // Disable scrollbars
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page finished loading');
    mainWindow.webContents.insertCSS(`
      ::-webkit-scrollbar {
        width: 0px;
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: transparent;
      }
    `);
    
    log.info('✅ Main window loaded successfully');
  });

  mainWindow.on('closed', () => {
    log.info('🔒 Main window closed');
    mainWindow = null;
  });

  // Monitor network status
  monitorNetworkStatus();
}

// Rest of your existing code stays the same...
function monitorNetworkStatus() {
  let checkInterval = 60000;
  let intervalId;
  
  const checkOnlineStatus = async () => {
    const wasOnline = networkStatus.isOnline;
    
    try {
      const { default: isOnline } = await import('is-online');
      networkStatus.isOnline = await isOnline();
      
      if (wasOnline !== networkStatus.isOnline) {
        log.info('📡 Network status changed:', { 
          from: wasOnline ? 'online' : 'offline',
          to: networkStatus.isOnline ? 'online' : 'offline',
          timestamp: new Date().toISOString()
        });
        
        if (mainWindow) {
          mainWindow.webContents.send('network-change', networkStatus.isOnline);
        }
        
        if (!networkStatus.isOnline) {
          checkInterval = 15000;
          restartInterval();
        } else {
          checkInterval = 60000;
          restartInterval();
        }
      }
    } catch (error) {
      const previousStatus = networkStatus.isOnline;
      networkStatus.isOnline = true;
      
      if (!previousStatus) {
        log.warn('⚠️  Network check failed, assuming online:', { error: error.message });
        
        if (mainWindow) {
          mainWindow.webContents.send('network-change', networkStatus.isOnline);
        }
      }
    }
  };
  
  const restartInterval = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
    intervalId = setInterval(checkOnlineStatus, checkInterval);
  };

  checkOnlineStatus();
  intervalId = setInterval(checkOnlineStatus, checkInterval);
  
  log.info('🔍 Network monitoring started:', { 
    initialInterval: `${checkInterval/1000}s`,
    offlineInterval: '15s',
    onlineInterval: '60s'
  });
}

app.on('ready', () => {
  console.log('📱 App ready, creating window');
  log.info('📱 App ready, creating window');
  createWindow();
  
  autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
  log.info('🚪 All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  log.info('🔄 App activated');
  if (mainWindow === null) {
    createWindow();
  }
});

// Your existing IPC handlers remain the same...
// (I'll keep them as they are to avoid breaking functionality)

// Print
ipcMain.handle('print', async () => {
  log.info('🖨️  Print request received');
  if (mainWindow) {
    try {
    mainWindow.webContents.print({ printBackground: true });
      log.info('✅ Print job sent successfully');
    } catch (error) {
      log.error('❌ Print failed:', { error: error.message });
      throw error;
    }
  }
});

// Get available printers
ipcMain.handle('get-printers', async () => {
  log.info('🖨️  Getting available printers');
  try {
    if (mainWindow) {
      const printers = mainWindow.webContents.getPrinters();
      log.info('✅ Retrieved printers:', { count: printers.length });
      return printers;
    }
    return [];
  } catch (error) {
    log.error('❌ Failed to get printers:', { error: error.message });
    return [];
  }
});

// Check printer connectivity
ipcMain.handle('check-printer-connectivity', async () => {
  log.info('🔍 Checking printer connectivity');
  try {
    if (mainWindow) {
      const printers = mainWindow.webContents.getPrinters();
      const isConnected = printers.length > 0;
      
      const enhancedPrinters = printers.map(printer => {
        const isThermal = detectThermalPrinter(printer.name);
        return {
          name: printer.name,
          status: printer.status,
          isDefault: printer.isDefault,
          isThermal: isThermal,
          priority: isThermal ? 1 : 2,
          port: printer.options?.port || 'Unknown',
          connectionType: detectConnectionType(printer),
          description: printer.description || '',
          location: printer.options?.location || ''
        };
      });

      let recommendedPrinter = null;
      const thermalPrinters = enhancedPrinters.filter(p => p.isThermal);
      if (thermalPrinters.length > 0) {
        recommendedPrinter = thermalPrinters[0];
      } else if (enhancedPrinters.length > 0) {
        recommendedPrinter = enhancedPrinters.find(p => p.isDefault) || enhancedPrinters[0];
      }

      log.info('✅ Printer connectivity checked:', { 
        isConnected, 
        printerCount: printers.length,
        thermalCount: thermalPrinters.length,
        printers: enhancedPrinters.map(p => ({ name: p.name, status: p.status, isThermal: p.isThermal }))
      });
      
      return {
        isConnected,
        printerCount: printers.length,
        printers: enhancedPrinters,
        recommendedPrinter: recommendedPrinter ? {
          name: recommendedPrinter.name,
          isThermal: recommendedPrinter.isThermal,
          priority: recommendedPrinter.priority
        } : null
      };
    }
    return { isConnected: false, printerCount: 0, printers: [], recommendedPrinter: null };
  } catch (error) {
    log.error('❌ Failed to check printer connectivity:', { error: error.message });
    return { isConnected: false, printerCount: 0, printers: [], recommendedPrinter: null };
  }
});

// Auto-connect to recommended printer
ipcMain.handle('auto-connect-printer', async () => {
  log.info('🔗 Auto-connecting to recommended printer');
  try {
    if (mainWindow) {
      const printers = mainWindow.webContents.getPrinters();
      if (printers.length === 0) {
        return { success: false, error: 'No printers available' };
      }

      const thermalPrinter = printers.find(p => detectThermalPrinter(p.name));
      const defaultPrinter = printers.find(p => p.isDefault);
      const selectedPrinter = thermalPrinter || defaultPrinter || printers[0];

      const isThermal = detectThermalPrinter(selectedPrinter.name);
      
      log.info('✅ Auto-connected to printer:', { 
        name: selectedPrinter.name, 
        isThermal,
        status: selectedPrinter.status 
      });

      return {
        success: true,
        printer: {
          name: selectedPrinter.name,
          isThermal: isThermal,
          priority: isThermal ? 1 : 2,
          status: selectedPrinter.status
        }
      };
    }
    return { success: false, error: 'No main window available' };
  } catch (error) {
    log.error('❌ Auto-connect failed:', { error: error.message });
    return { success: false, error: error.message };
  }
});

// Test printer connection
ipcMain.handle('test-printer', async (event, printerName) => {
  log.info('🧪 Testing printer:', { printerName });
  try {
    if (mainWindow) {
      const printers = mainWindow.webContents.getPrinters();
      const printer = printers.find(p => p.name === printerName);
      
      if (!printer) {
        return { success: false, error: 'Printer not found' };
      }

      const isThermal = detectThermalPrinter(printer.name);
      
      log.info('✅ Printer test successful:', { 
        name: printer.name, 
        status: printer.status,
        isThermal 
      });

      return {
        success: true,
        printer: {
          name: printer.name,
          status: printer.status,
          isThermal: isThermal
        }
      };
    }
    return { success: false, error: 'No main window available' };
  } catch (error) {
    log.error('❌ Printer test failed:', { error: error.message });
    return { success: false, error: error.message };
  }
});

// Version check
ipcMain.handle('check-latest-version', async () => {
  log.info('🔍 Checking for latest version');
  
  if (!VERSION_URL) {
    log.warn('⚠️  No update server URL configured');
    return null;
  }
  
  try {
    new URL(VERSION_URL);
  } catch (error) {
    log.error('❌ Invalid update server URL:', VERSION_URL);
    return null;
  }
  
  return new Promise((resolve, reject) => {
    const request = https.get(VERSION_URL, (res) => {
      if (res.statusCode !== 200) {
        log.warn(`⚠️  Version check returned status ${res.statusCode}`);
        resolve(null);
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const versionData = JSON.parse(data);
          log.info('✅ Version check completed:', versionData);
          resolve(versionData);
        } catch (e) {
          log.warn('⚠️  Version check failed - invalid JSON');
          resolve(null);
        }
      });
    });
    
    request.on('error', (error) => {
      log.error('❌ Version check failed:', { error: error.message });
      resolve(null);
    });
    
    request.setTimeout(10000, () => {
      log.warn('⚠️  Version check timed out');
      request.destroy();
      resolve(null);
    });
  });
});

// Open external link
ipcMain.handle('open-external', async (event, url) => {
  log.info('🔗 Opening external URL:', { url });
  try {
    await shell.openExternal(url);
    log.info('✅ External URL opened successfully');
  } catch (error) {
    log.error('❌ Failed to open external URL:', { error: error.message });
    throw error;
  }
});

// Offline storage handlers
ipcMain.handle('store-get', async (event, key, defaultValue) => {
  try {
    const value = store.get(key, defaultValue);
    log.info('📦 Store get:', { key, hasValue: value !== undefined });
    return value;
  } catch (error) {
    log.error('❌ Store get failed:', { key, error: error.message });
    return defaultValue;
  }
});

ipcMain.handle('store-set', async (event, key, value) => {
  try {
    store.set(key, value);
    log.info('💾 Store set:', { key, valueType: typeof value });
    return true;
  } catch (error) {
    log.error('❌ Store set failed:', { key, error: error.message });
    throw error;
  }
});

ipcMain.handle('store-delete', async (event, key) => {
  try {
    store.delete(key);
    log.info('🗑️  Store delete:', { key });
    return true;
  } catch (error) {
    log.error('❌ Store delete failed:', { key, error: error.message });
    throw error;
  }
});

ipcMain.handle('store-clear', async () => {
  try {
    store.clear();
    log.info('🧹 Store cleared');
    return true;
  } catch (error) {
    log.error('❌ Store clear failed:', { error: error.message });
    throw error;
  }
});

// Network status
ipcMain.handle('is-online', async () => {
  try {
    const { default: isOnline } = await import('is-online');
    const status = await isOnline();
    log.info('📡 Network status check:', { isOnline: status });
    return status;
  } catch (error) {
    log.error('❌ Network check failed:', { error: error.message });
    return false;
  }
});

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  log.info('🔍 Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  log.info('🆕 Update available:', info);
});

autoUpdater.on('update-not-available', (info) => {
  log.info('✅ Update not available:', info);
});

autoUpdater.on('error', (err) => {
  log.error('❌ Auto-updater error:', { error: err.message });
});

autoUpdater.on('download-progress', (progressObj) => {
  let logMessage = 'Download speed: ' + progressObj.bytesPerSecond;
  logMessage = logMessage + ' - Downloaded ' + progressObj.percent + '%';
  logMessage = logMessage + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
  log.info('📥 Download progress:', logMessage);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('✅ Update downloaded:', info);
  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 5000);
});

log.info('🎯 Main process initialization complete'); 

// Helper functions
function detectThermalPrinter(printerName) {
  const thermalKeywords = [
    'thermal', 'receipt', 'pos', 'cash', 'register', 'terminal',
    'star', 'citizen', 'epson tm', 'bixolon', 'zjiang', 'custom',
    'label', 'ticket', 'slip', 'bill'
  ];
  
  const lowerName = printerName.toLowerCase();
  return thermalKeywords.some(keyword => lowerName.includes(keyword));
}

function detectConnectionType(printer) {
  const name = printer.name.toLowerCase();
  const options = printer.options || {};
  
  if (name.includes('usb') || options.port?.includes('usb')) return 'USB';
  if (name.includes('wifi') || name.includes('wireless') || name.includes('network')) return 'WiFi';
  if (name.includes('bluetooth') || name.includes('bt')) return 'Bluetooth';
  if (name.includes('ethernet') || name.includes('lan')) return 'Ethernet';
  
  return 'Unknown';
}