// Extended Electron API types
export interface ElectronStore {
  get: (key: string, defaultValue?: any) => any;
  set: (key: string, value: any) => void;
  delete: (key: string) => void;
  clear: () => void;
}

export interface PrinterInfo {
  name: string;
  status: string;
  isDefault: boolean;
}

export interface PrinterConnectivity {
  isConnected: boolean;
  printerCount: number;
  printers: PrinterInfo[];
}

export interface ExtendedElectronAPI {
  checkLatestVersion: () => Promise<any>;
  print: () => void;
  openExternal: (url: string) => void;
  getPrinters: () => Promise<any[]>;
  checkPrinterConnectivity: () => Promise<PrinterConnectivity>;
  store: ElectronStore;
  isOnline: () => Promise<boolean>;
  onNetworkChange: (callback: (isOnline: boolean) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ExtendedElectronAPI;
  }
} 