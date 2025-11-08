import { createClient } from '@supabase/supabase-js';

// Environment validation
interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  environment: string;
  enableDebugLogs: boolean;
}

// Validate required environment variables
const requiredEnvVars = [
  'REACT_APP_SUPABASE_URL',
  'REACT_APP_SUPABASE_ANON_KEY'
];

// Optional service role key for admin operations
const optionalEnvVars = [
  'REACT_APP_SUPABASE_SERVICE_ROLE_KEY'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  const errorMessage = `🚀 Supabase Configuration Error!\n\n` +
    `Missing required environment variables:\n${missingEnvVars.map(v => `  - ${v}`).join('\n')}\n\n` +
    `Please:\n` +
    `1. Add Supabase configuration to your .env file\n` +
    `2. Get these values from your Supabase project dashboard\n` +
    `3. Refer to ENVIRONMENT_SETUP.md for detailed instructions\n\n` +
    `Never commit .env files to version control!`;
  
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Validate environment variable formats
const validateConfig = (): void => {
  const url = process.env.REACT_APP_SUPABASE_URL!;
  const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;
  
  // Basic format validation
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    console.warn('⚠️  Supabase URL format seems incorrect');
  }
  
  if (!anonKey.startsWith('eyJ')) {
    console.warn('⚠️  Supabase anon key format seems incorrect');
  }
  
  // Development vs Production checks
  const environment = process.env.REACT_APP_ENVIRONMENT || 'development';
  const enableDebugLogs = process.env.REACT_APP_ENABLE_DEBUG_LOGS === 'true';
  
  if (environment === 'production') {
    if (enableDebugLogs) {
      console.warn('⚠️  Debug logs are enabled in production environment');
    }
    
    if (url.includes('localhost') || url.includes('test') || url.includes('dev')) {
      console.error('🚨 Production build using development Supabase configuration!');
    }
  }
  
  // Security warnings
  if (anonKey.includes('example') || anonKey.includes('your_anon_key_here')) {
    throw new Error('🚨 Please replace example Supabase configuration with real values');
  }
};

// Validate configuration
validateConfig();

// Get environment configuration
const getSupabaseConfig = (): SupabaseConfig => ({
  url: process.env.REACT_APP_SUPABASE_URL!,
  anonKey: process.env.REACT_APP_SUPABASE_ANON_KEY!,
  serviceRoleKey: process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY,
  environment: process.env.REACT_APP_ENVIRONMENT || 'development',
  enableDebugLogs: process.env.REACT_APP_ENABLE_DEBUG_LOGS === 'true'
});

const config = getSupabaseConfig();

// Create Supabase client (for regular operations)
export const supabase = createClient(config.url, config.anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Create admin client (for admin operations like creating users)
export const supabaseAdmin = config.serviceRoleKey 
  ? createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Export configuration for debugging (non-sensitive data only)
export const supabaseEnvironment = {
  url: config.url,
  environment: config.environment,
  debugMode: config.enableDebugLogs
};

if (config.enableDebugLogs) {
  console.log('🚀 Supabase initialized successfully', {
    url: config.url,
    environment: config.environment
  });
}

export default supabase;