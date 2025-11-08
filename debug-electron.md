# 🔍 Electron White Page Debug Guide

## Step 1: Enable Developer Tools

Add this to your `main.js` file temporarily (around line 50):

```javascript
// Add this after creating mainWindow
mainWindow.webContents.openDevTools(); // Add this line to see console errors
```

## Step 2: Check Console Errors

1. **Run the app**: `npm run electron`
2. **Look at the DevTools console** for any red errors
3. **Check the Network tab** for failed resource loads

## Step 3: Common Issues & Fixes

### Issue 1: Path Problems
Your `main.js` loads from `build/index.html`, but check if the path is correct:

```javascript
// Current path in main.js
const VITE_DIST_PATH = path.join(__dirname, 'build', 'index.html');

// Make sure this file exists by running:
// ls -la build/index.html
```

### Issue 2: Missing Build
Make sure you've built the React app:

```bash
npm run build
```

### Issue 3: Environment Variables
Electron doesn't automatically load `.env` files. Add this to the top of `main.js`:

```javascript
// Add at the very top of main.js
require('dotenv').config();
```

### Issue 4: Content Security Policy
The built app might have CSP issues. Check if `build/index.html` has any CSP meta tags blocking resources.

## Step 4: Quick Fixes to Try

### Fix 1: Update main.js path loading
Replace the loadFile line with:

```javascript
// Instead of:
mainWindow.loadFile(VITE_DIST_PATH);

// Try:
const indexPath = path.join(__dirname, 'build', 'index.html');
console.log('Loading from:', indexPath);
mainWindow.loadFile(indexPath);
```

### Fix 2: Add error handling
Add this to see what's happening:

```javascript
mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
  console.error('Failed to load:', errorCode, errorDescription);
});

mainWindow.webContents.on('crashed', (event, killed) => {
  console.error('Renderer crashed:', killed);
});
```

### Fix 3: Check if build is complete
Run this to verify your build:

```bash
# Check if build directory has all files
ls -la build/
ls -la build/static/js/
ls -la build/static/css/
```

## Step 5: Alternative Loading Method

If the file loading fails, try loading via URL:

```javascript
// Replace loadFile with loadURL for testing
const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  mainWindow.loadURL('http://localhost:3000');
} else {
  mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
}
```

## Step 6: Test React App Separately

Make sure your React app works in browser:

```bash
npm start
# Open http://localhost:3000 and check for errors
```

## Most Likely Causes:

1. **Missing build** - Run `npm run build` first
2. **JavaScript errors** - Check DevTools console
3. **Path issues** - Verify build/index.html exists
4. **Environment variables** - Add dotenv to main.js
5. **Supabase connection** - Check if Supabase is accessible

## Quick Test:

Create a minimal test by temporarily replacing your App.tsx with:

```tsx
import React from 'react';

const App: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontSize: '24px' }}>
      <h1>Electron Test - App is Working!</h1>
      <p>If you see this, React is loading correctly.</p>
    </div>
  );
};

export default App;
```

Then rebuild and test: `npm run build && npm run electron`