# 🔧 Account Configuration Error Fix

## Problem: "Account configuration error. Please contact support."

This error occurs when a user exists in Supabase Auth but doesn't have corresponding records in your database tables.

## Common Causes

1. **Developer account** created manually in Supabase Auth
2. **Incomplete user registration** where Auth succeeded but database inserts failed
3. **Database schema changes** that left existing users without proper records
4. **Manual user creation** in Supabase dashboard without database setup

## 🚀 Quick Fix Solutions

### Solution 1: Run Account Fix Script (Recommended)

1. **Log into Supabase Dashboard** with the problematic account
2. **Go to SQL Editor**
3. **Run this script**: `scripts/fix-account-configuration.sql`
4. **Try logging in again**

### Solution 2: Manual Developer Account Setup

If you're fixing the developer account (`sura.resto.biz@gmail.com`):

1. **Log into Supabase Dashboard** as the developer
2. **Run**: `scripts/setup-developer-account.sql`
3. **Verify the setup** with the verification query in the script

### Solution 3: Check Database Tables

Verify your account exists in all required tables:

```sql
-- Check if user exists in auth.users
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Check restaurant_profile
SELECT * FROM restaurant_profile WHERE owner_email = 'your-email@example.com';

-- Check users_index
SELECT * FROM users_index WHERE email = 'your-email@example.com';

-- Check restaurant_profile_users
SELECT * FROM restaurant_profile_users WHERE email = 'your-email@example.com';
```

## 🔍 Detailed Troubleshooting

### Step 1: Identify the Issue

The error message now includes more details:
- User ID
- Email
- Which table lookup failed

### Step 2: Check Auth User Exists

```sql
SELECT id, email, created_at FROM auth.users WHERE email = 'problematic-email@example.com';
```

### Step 3: Check Database Records

```sql
-- This should return 1 for each table if properly configured
SELECT 
    (SELECT COUNT(*) FROM restaurant_profile WHERE owner_email = 'your-email') as restaurant_count,
    (SELECT COUNT(*) FROM users_index WHERE email = 'your-email') as index_count,
    (SELECT COUNT(*) FROM restaurant_profile_users WHERE email = 'your-email') as profile_count;
```

### Step 4: Run the Fix Script

The `fix-account-configuration.sql` script will:
- ✅ Create missing restaurant profile
- ✅ Add user to users_index
- ✅ Add user to restaurant_profile_users
- ✅ Set appropriate permissions and roles
- ✅ Handle developer account special case

## 🛡️ Prevention

To prevent this issue in the future:

1. **Always use the app's registration flow** instead of manual Auth creation
2. **Test user creation** in development before production
3. **Monitor failed registrations** and fix incomplete accounts
4. **Use database transactions** for user creation to ensure atomicity

## 🚨 Emergency Access

If you're completely locked out:

1. **Create a new user** through your website registration
2. **Use that account** to access the system
3. **Fix the problematic account** using the admin interface
4. **Delete the temporary account** if needed

## ✅ Verification

After running the fix script, verify everything works:

1. **Log out** of Supabase Dashboard
2. **Try logging into your app** with the fixed account
3. **Check all features** work correctly
4. **Verify role permissions** are correct

## 📞 Still Need Help?

If the scripts don't work:

1. **Check browser console** for detailed error messages
2. **Verify database schema** is up to date
3. **Check RLS policies** are not blocking the operations
4. **Contact support** with the specific error details

The enhanced error messages now provide the exact User ID and email to help with troubleshooting!