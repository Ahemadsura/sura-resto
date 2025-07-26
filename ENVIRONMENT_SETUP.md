# 🔐 Environment Variables Setup Guide

## Required Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Firebase Configuration - Get these from Firebase Console > Project Settings > General
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id_here
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
REACT_APP_FIREBASE_APP_ID=your_firebase_app_id_here

# Optional: Firebase Measurement ID (if using Analytics)
# REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id_here

# Application Configuration
REACT_APP_APP_VERSION=0.1.0
REACT_APP_ENVIRONMENT=production

# Security Configuration
REACT_APP_ENABLE_DEBUG_LOGS=false

# Auto-updater Configuration (for Electron builds)
REACT_APP_UPDATE_SERVER_URL=https://your-update-server.com/api/check-updates
```

## 🛡️ Security Best Practices

### 1. **Firebase Security Configuration**
```bash
# In Firebase Console:
1. Go to Project Settings > General
2. Scroll to "Your apps" section
3. Click the gear icon for your web app
4. Under "App domains", add only your production domains
5. Never use localhost domains in production
```

### 2. **API Key Restrictions**
```bash
# In Google Cloud Console:
1. Go to APIs & Services > Credentials
2. Find your Firebase API key
3. Click "Restrict Key"
4. Add HTTP referrers restrictions:
   - https://yourdomain.com/*
   - https://your-electron-app.com/* (if applicable)
```

### 3. **Firebase App Check** (Highly Recommended)
```bash
# Enable App Check for additional security:
1. Go to Firebase Console > App Check
2. Enable for your web app
3. Use reCAPTCHA v3 for web
4. Add to your app initialization
```

### 4. **Environment-Specific Configurations**

#### Development Environment
```env
REACT_APP_FIREBASE_PROJECT_ID=your-dev-project-id
REACT_APP_ENVIRONMENT=development
REACT_APP_ENABLE_DEBUG_LOGS=true
```

#### Production Environment
```env
REACT_APP_FIREBASE_PROJECT_ID=your-prod-project-id
REACT_APP_ENVIRONMENT=production
REACT_APP_ENABLE_DEBUG_LOGS=false
```

## 🔍 Validation & Testing

### Check Configuration
```bash
# Test your environment variables
npm start

# Look for these logs in console:
✅ Firebase initialized successfully
✅ All required environment variables present
❌ Missing required environment variables: [list]
```

### Validate Firebase Connection
```javascript
// In browser console:
firebase.auth().currentUser
// Should return null (not undefined) if properly configured
```

## 🚨 Security Checklist

- [ ] ✅ `.env` file is in `.gitignore`
- [ ] ✅ API keys are restricted to specific domains
- [ ] ✅ Using separate Firebase projects for dev/prod
- [ ] ✅ Firebase App Check is enabled
- [ ] ✅ Firestore security rules are properly configured
- [ ] ✅ No hardcoded credentials in source code
- [ ] ✅ Regular credential rotation schedule established

## 🔧 Troubleshooting

### Common Issues:

1. **"Firebase project not found"**
   - Check `REACT_APP_FIREBASE_PROJECT_ID`
   - Ensure project exists in Firebase Console

2. **"API key restrictions"**
   - Add your domain to API key restrictions
   - Use localhost:3000 for development only

3. **"App Check verification failed"**
   - Verify App Check is properly configured
   - Check domain whitelist in App Check settings

4. **"Invalid credentials"**
   - Regenerate Firebase configuration
   - Ensure all environment variables are correct

## 📞 Support

If you encounter configuration issues:
1. Check Firebase Console for error messages
2. Verify all environment variables are present
3. Test with a minimal Firebase app first
4. Contact support with specific error messages

---

**⚠️ IMPORTANT**: Never commit `.env` files to version control. Always use environment-specific configurations for different deployment stages. 