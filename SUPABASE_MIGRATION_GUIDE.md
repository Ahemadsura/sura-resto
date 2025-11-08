# Firebase to Supabase Migration Guide

This guide walks you through migrating your SURA Restaurant app from Firebase Auth to Supabase Auth while maintaining zero downtime and preserving all user data.

## 🎯 Migration Overview

### What We're Migrating
- **Firebase Authentication** → **Supabase Authentication**
- **Firestore Database** → **Supabase PostgreSQL**
- **Firebase Functions** → **Supabase Edge Functions** (optional)
- **User sessions and roles** → **Preserved with same functionality**

### Why Migrate?
- ✅ Better pricing model
- ✅ Full PostgreSQL database
- ✅ Better real-time capabilities
- ✅ More flexible auth policies
- ✅ Open source alternative

## 📋 Pre-Migration Checklist

- [ ] Backup all Firebase data
- [ ] Set up Supabase project
- [ ] Test migration scripts in development
- [ ] Prepare user communication
- [ ] Schedule maintenance window (optional)

## 🚀 Step-by-Step Migration

### Step 1: Set Up Supabase Project

1. **Create Supabase Project**
   ```bash
   # Go to https://supabase.com
   # Create new project
   # Note down your project URL and keys
   ```

2. **Install Supabase Dependencies**
   ```bash
   npm install @supabase/supabase-js
   ```

3. **Update Environment Variables**
   ```env
   # Add to .env
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
   
   # Keep Firebase vars for now (during transition)
   REACT_APP_FIREBASE_API_KEY=your-firebase-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-domain
   # ... other Firebase vars
   ```

### Step 2: Run Database Migration

1. **Navigate to Migration Directory**
   ```bash
   cd migration
   npm install
   ```

2. **Configure Migration Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Download Firebase Service Account**
   - Go to Firebase Console > Project Settings > Service Accounts
   - Generate new private key
   - Save as `firebase-service-account.json` in migration directory

4. **Set Up Supabase Schema**
   ```bash
   # Copy contents of supabase-schema.sql
   # Run in Supabase SQL Editor
   ```

5. **Test Connections**
   ```bash
   npm run test-connection
   ```

6. **Run Migration**
   ```bash
   npm run migrate
   ```

### Step 3: Update Frontend Code

#### 3.1 Update Package Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "firebase": "^11.9.0"  // Keep for gradual migration
  }
}
```

#### 3.2 Create Supabase Configuration

The Supabase config file has already been created at `src/config/supabase.ts`.

#### 3.3 Update Auth Context

The new Supabase auth context has been created at `src/contexts/SupabaseAuthContext.tsx`.

#### 3.4 Update Main App Component

```typescript
// src/App.tsx - Update imports
import { AuthProvider } from './contexts/SupabaseAuthContext'; // New
// import { AuthProvider } from './contexts/AuthContext'; // Old

function App() {
  return (
    <AuthProvider>
      {/* Your app components */}
    </AuthProvider>
  );
}
```

#### 3.5 Update Type Definitions

```typescript
// src/types/index.ts - Update User interface
export interface User {
  uid: string;
  email: string;
  role: 'owner' | 'manager';
  restaurantId: string;
  displayName?: string;
  isActive?: boolean;
  devBypass?: boolean; // Add new fields as needed
}
```

### Step 4: Update Database Queries

#### 4.1 Replace Firestore with Supabase

```typescript
// OLD: Firebase Firestore
import { doc, getDoc, collection, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

const getUserData = async (uid: string) => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.data();
};

// NEW: Supabase
import { supabase } from '../config/supabase';

const getUserData = async (uid: string) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', uid)
    .single();
  
  if (error) throw error;
  return data;
};
```

#### 4.2 Update Menu Items Queries

```typescript
// OLD: Firestore
const getMenuItems = async (restaurantId: string) => {
  const q = query(
    collection(db, 'restaurantProfile', restaurantId, 'menuItems'),
    where('isAvailable', '==', true)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// NEW: Supabase
const getMenuItems = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_available', true);
  
  if (error) throw error;
  return data;
};
```

#### 4.3 Update Bills Queries

```typescript
// OLD: Firestore
const createBill = async (restaurantId: string, billData: any) => {
  const billRef = doc(collection(db, 'restaurantProfile', restaurantId, 'bills'));
  await setDoc(billRef, {
    ...billData,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid
  });
  return billRef.id;
};

// NEW: Supabase
const createBill = async (restaurantId: string, billData: any) => {
  const { data, error } = await supabase
    .from('bills')
    .insert({
      ...billData,
      restaurant_id: restaurantId,
      created_by: supabase.auth.user()?.id
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};
```

### Step 5: Update Authentication Flow

#### 5.1 Login Component Updates

```typescript
// Update login form to use new auth context
import { useAuth } from '../contexts/SupabaseAuthContext';

const LoginForm = () => {
  const { login } = useAuth();
  
  const handleLogin = async (email: string, password: string, role: 'owner' | 'manager') => {
    try {
      await login(email, password, role);
      // Success - user will be redirected by auth context
    } catch (error) {
      // Handle error - show user-friendly message
      setError(error.message);
    }
  };
  
  // Rest of component remains the same
};
```

#### 5.2 Add Password Reset Flow

```typescript
// Add password reset functionality
import { useAuth } from '../contexts/SupabaseAuthContext';

const PasswordResetForm = () => {
  const { resetPassword } = useAuth();
  
  const handleReset = async (email: string) => {
    try {
      await resetPassword(email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (error) {
      setError(error.message);
    }
  };
  
  // Form JSX
};
```

### Step 6: Update Cloud Functions (Optional)

If you want to migrate Firebase Functions to Supabase Edge Functions:

#### 6.1 Create Edge Function for Manager Creation

```typescript
// supabase/functions/create-manager/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { email, password, displayName, restaurantId } = await req.json();
  
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  // Create user logic here
  // Similar to Firebase function but using Supabase
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### Step 7: Testing Phase

#### 7.1 Feature Flag Implementation

```typescript
// Add feature flag for gradual rollout
const USE_SUPABASE = process.env.REACT_APP_USE_SUPABASE === 'true';

// In your components
const AuthProvider = USE_SUPABASE ? SupabaseAuthProvider : FirebaseAuthProvider;
```

#### 7.2 Test Checklist

- [ ] User login with migrated accounts
- [ ] Password reset flow
- [ ] Role-based access control
- [ ] Menu item CRUD operations
- [ ] Bill creation and management
- [ ] Staff management
- [ ] Expense tracking
- [ ] Real-time updates (if applicable)

### Step 8: Go Live

#### 8.1 Update Environment Variables

```env
# Production .env
REACT_APP_USE_SUPABASE=true
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-production-anon-key

# Keep Firebase vars as backup initially
```

#### 8.2 Deploy and Monitor

1. **Deploy to production**
2. **Monitor error rates**
3. **Check user login success rates**
4. **Monitor database performance**
5. **Prepare support for password reset requests**

### Step 9: Post-Migration Cleanup

#### 9.1 User Communication

Send email to all users:
```
Subject: Important: Password Reset Required

Dear [User],

We've upgraded our authentication system for better security and performance. 
You'll need to reset your password on your next login.

1. Go to [your-app-url]
2. Click "Forgot Password"
3. Enter your email address
4. Check your email for reset instructions

Your account data and restaurant information remain unchanged.

Best regards,
SURA Team
```

#### 9.2 Remove Firebase Dependencies (After 30 days)

```bash
# Remove Firebase packages
npm uninstall firebase firebase-admin

# Remove Firebase config files
rm src/config/firebase.ts
rm src/contexts/AuthContext.tsx

# Update environment variables
# Remove all REACT_APP_FIREBASE_* variables
```

## 🛡️ Security Considerations

### Row Level Security (RLS)

Supabase uses PostgreSQL's RLS for data security:

```sql
-- Example RLS policy
CREATE POLICY "Users can only see their restaurant data" ON bills
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );
```

### API Security

- ✅ Use anon key for client-side operations
- ✅ Use service role key only for admin operations
- ✅ Implement proper RLS policies
- ✅ Validate user permissions in Edge Functions

## 📊 Monitoring and Analytics

### Key Metrics to Track

1. **Authentication Success Rate**
2. **Password Reset Requests**
3. **Database Query Performance**
4. **Error Rates by Feature**
5. **User Session Duration**

### Supabase Dashboard

Monitor your migration through:
- Authentication > Users
- Database > Tables
- API > Logs
- Settings > Usage

## 🆘 Troubleshooting

### Common Issues

#### Users Can't Login
- Check if user exists in Supabase Auth
- Verify user profile exists in user_profiles table
- Check if user is marked as active

#### Database Queries Fail
- Verify RLS policies are correct
- Check table permissions
- Ensure user has proper role

#### Performance Issues
- Add database indexes
- Optimize queries
- Use Supabase's built-in caching

### Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Migration Scripts](./migration/)
- [Community Support](https://github.com/supabase/supabase/discussions)

## 🎉 Migration Complete!

Congratulations! You've successfully migrated from Firebase to Supabase. Your users now have:

- ✅ More secure authentication
- ✅ Better database performance
- ✅ Lower costs
- ✅ More flexibility for future features

Remember to monitor the system closely for the first few weeks and be ready to assist users with password resets.