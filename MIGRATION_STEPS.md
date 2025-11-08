# 🚀 Your Firebase to Supabase Migration - Step by Step

## ✅ Completed Steps
- [x] Supabase package installed
- [x] Migration scripts created
- [x] User type updated
- [x] Environment variables template added
- [x] Migration dependencies installed

## 📋 Next Steps to Complete

### Step 1: Create Supabase Project (5 minutes)

1. **Go to [supabase.com](https://supabase.com)**
2. **Sign up/Login** with your GitHub account
3. **Create New Project**:
   - Project Name: `sura-resto` (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Choose closest to your users
4. **Wait for project setup** (takes 2-3 minutes)

### Step 2: Get Supabase Credentials (2 minutes)

1. **In your Supabase dashboard**, go to **Settings > API**
2. **Copy these values**:
   - Project URL (looks like: `https://abcdefgh.supabase.co`)
   - anon/public key (starts with `eyJ...`)

3. **Update your `.env` file**:
   ```env
   # Replace these with your actual values
   REACT_APP_SUPABASE_URL=https://your-actual-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Step 3: Set Up Database Schema (3 minutes)

1. **In Supabase dashboard**, go to **SQL Editor**
2. **Copy the contents** of `migration/supabase-schema.sql`
3. **Paste and run** the SQL in the editor
4. **Verify tables created** in Database > Tables

### Step 4: Configure Migration Environment (2 minutes)

1. **Navigate to migration directory**:
   ```bash
   cd migration
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Edit `migration/.env`** with your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
   
   **Note**: Use the **service_role** key (not anon key) for migration - find it in Settings > API

### Step 5: Download Firebase Service Account (2 minutes)

1. **Go to Firebase Console** > Project Settings > Service Accounts
2. **Click "Generate new private key"**
3. **Save the file** as `migration/firebase-service-account.json`

### Step 6: Test Connections (1 minute)

```bash
npm run migrate:test
```

**Expected output**:
```
✅ Firebase connection successful
✅ Supabase connection successful
🎉 All connections successful! Ready to run migration.
```

### Step 7: Run the Migration (5-10 minutes)

```bash
# Export Firebase data
npm run migrate:export

# Import to Supabase  
npm run migrate:import

# Or do both at once
npm run migrate:run
```

**Monitor the output** for success rates and any errors.

### Step 8: Update Frontend Code (2 minutes)

1. **Update import statements**:
   ```bash
   npm run migrate:update-imports
   ```

2. **Update your main App.tsx**:
   ```typescript
   // Change from:
   import { AuthProvider } from './contexts/AuthContext';
   
   // To:
   import { AuthProvider } from './contexts/SupabaseAuthContext';
   ```

### Step 9: Test in Development (10 minutes)

1. **Start your development server**:
   ```bash
   npm start
   ```

2. **Test these features**:
   - [ ] Login with migrated user account
   - [ ] Password reset flow (users will need to reset passwords)
   - [ ] Role-based access (owner vs manager)
   - [ ] Data loading (menu items, bills, etc.)
   - [ ] Creating new bills
   - [ ] User management (if owner)

### Step 10: Deploy to Production (When Ready)

1. **Update production environment variables**:
   ```env
   REACT_APP_USE_SUPABASE=true
   REACT_APP_SUPABASE_URL=your-production-supabase-url
   REACT_APP_SUPABASE_ANON_KEY=your-production-anon-key
   ```

2. **Deploy your application**

3. **Monitor for issues** and user feedback

## 🆘 Troubleshooting

### Common Issues:

**Connection Failed**:
- Check your Supabase URL and keys
- Ensure service_role key is used for migration (not anon key)
- Verify Firebase service account JSON is correct

**Migration Errors**:
- Check the import results in `migration/supabase-import-results.json`
- Review failed imports and handle manually if needed
- Ensure database schema was applied correctly

**Login Issues**:
- Users need to reset passwords (Firebase hashes can't be transferred)
- Check user exists in Supabase Auth dashboard
- Verify user profile exists in user_profiles table

## 📧 User Communication Template

Send this to your users after migration:

```
Subject: Important: Password Reset Required - SURA Restaurant System

Dear [User Name],

We've upgraded our system for better security and performance. 

ACTION REQUIRED: Please reset your password on your next login.

Steps:
1. Go to [your-app-url]
2. Click "Forgot Password" 
3. Enter your email
4. Check email for reset link

Your restaurant data and access remain unchanged.

Questions? Contact support at [your-support-email]

Best regards,
SURA Team
```

## 🎉 Success Checklist

- [ ] Supabase project created
- [ ] Database schema applied
- [ ] Migration completed with >95% success rate
- [ ] Frontend updated and tested
- [ ] Users can login after password reset
- [ ] All features working correctly
- [ ] Production deployment successful
- [ ] User communication sent

## 📞 Need Help?

If you encounter issues:

1. **Check the detailed guides**:
   - `SUPABASE_MIGRATION_GUIDE.md` - Complete technical guide
   - `MIGRATION_CHECKLIST.md` - Detailed checklist
   - `migration/README.md` - Migration scripts documentation

2. **Review logs and results**:
   - Migration results in `migration/supabase-import-results.json`
   - Browser console for frontend errors
   - Supabase dashboard for auth and database issues

3. **Test step by step**:
   - Use `npm run migrate:test` to verify connections
   - Check each migration step individually
   - Test in development before production

Remember: This migration preserves all your data while moving to a more flexible and cost-effective platform. Take your time with each step and test thoroughly!

**Current Status**: Ready for Step 1 - Create Supabase Project 🚀