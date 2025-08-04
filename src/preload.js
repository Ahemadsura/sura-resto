// This is a JS preload script for Electron, not a TypeScript file.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkLatestVersion: () => ipcRenderer.invoke('check-latest-version'),
  print: () => ipcRenderer.invoke('print'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Printer Management APIs
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  checkPrinterConnectivity: () => ipcRenderer.invoke('check-printer-connectivity'),
  autoConnectPrinter: () => ipcRenderer.invoke('auto-connect-printer'),
  testPrinter: (printerName) => ipcRenderer.invoke('test-printer', printerName),
  
  // Offline Management APIs
  store: {
    get: (key, defaultValue) => ipcRenderer.invoke('store-get', key, defaultValue),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key),
    clear: () => ipcRenderer.invoke('store-clear')
  },
  
  // Network Management
  isOnline: () => ipcRenderer.invoke('is-online'),
  onNetworkChange: (callback) => {
    ipcRenderer.on('network-change', (event, isOnline) => callback(isOnline));
    
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeAllListeners('network-change');
    };
  }
}); 