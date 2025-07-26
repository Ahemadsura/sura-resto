import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Environment validation with enhanced security checks
interface EnvironmentConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  environment: string;
  enableDebugLogs: boolean;
}

// Validate required environment variables
const requiredEnvVars = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID'
];

// Check for missing variables
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  const errorMessage = `🔥 Firebase Configuration Error!\n\n` +
    `Missing required environment variables:\n${missingEnvVars.map(v => `  - ${v}`).join('\n')}\n\n` +
    `Please:\n` +
    `1. Create a .env file in your project root\n` +
    `2. Add all required Firebase configuration variables\n` +
    `3. Refer to ENVIRONMENT_SETUP.md for detailed instructions\n\n` +
    `Never commit .env files to version control!`;
  
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Validate environment variable formats
const validateConfig = (): void => {
  const apiKey = process.env.REACT_APP_FIREBASE_API_KEY!;
  const authDomain = process.env.REACT_APP_FIREBASE_AUTH_DOMAIN!;
  const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID!;
  
  // Basic format validation
  if (!apiKey.startsWith('AIza') && !apiKey.startsWith('BIza')) {
    console.warn('⚠️  Firebase API key format seems incorrect');
  }
  
  if (!authDomain.includes('.firebaseapp.com') && !authDomain.includes('.web.app')) {
    console.warn('⚠️  Firebase auth domain format seems incorrect');
  }
  
  if (projectId.length < 3 || projectId.includes(' ')) {
    console.warn('⚠️  Firebase project ID format seems incorrect');
  }
  
  // Development vs Production checks
  const environment = process.env.REACT_APP_ENVIRONMENT || 'development';
  const enableDebugLogs = process.env.REACT_APP_ENABLE_DEBUG_LOGS === 'true';
  
  if (environment === 'production') {
    if (enableDebugLogs) {
      console.warn('⚠️  Debug logs are enabled in production environment');
    }
    
    if (authDomain.includes('localhost') || projectId.includes('test') || projectId.includes('dev')) {
      console.error('🚨 Production build using development Firebase configuration!');
    }
  }
  
  // Security warnings
  if (apiKey.includes('example') || apiKey.includes('your_api_key_here')) {
    throw new Error('🚨 Please replace example Firebase configuration with real values');
  }
};

// Validate configuration
validateConfig();

// Get environment configuration
const getEnvironmentConfig = (): EnvironmentConfig => ({
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY!,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.REACT_APP_FIREBASE_APP_ID!,
  environment: process.env.REACT_APP_ENVIRONMENT || 'development',
  enableDebugLogs: process.env.REACT_APP_ENABLE_DEBUG_LOGS === 'true'
});

const config = getEnvironmentConfig();

// Firebase configuration object
const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  
  if (config.enableDebugLogs) {
    console.log('🔥 Firebase initialized successfully', {
      projectId: config.projectId,
      environment: config.environment,
      authDomain: config.authDomain
    });
  }
} catch (error) {
  console.error('🚨 Firebase initialization failed:', error);
  throw new Error(`Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Export configuration for debugging (non-sensitive data only)
export const firebaseEnvironment = {
  projectId: config.projectId,
  environment: config.environment,
  debugMode: config.enableDebugLogs
};

export default app; 