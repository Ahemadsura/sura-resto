# 🚀 SURA Supabase Setup Guide

## Overview
This guide will help you set up Supabase for the SURA Restaurant Management System with proper user management and subscription enforcement.

## Prerequisites
- Supabase account and project created
- SURA website already connected to Supabase
- Restaurant registrations working on website

## Step 1: Database Schema Setup

### 1.1 Apply Database Schema
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `scripts/setup-supabase-schema.sql`
4. Click **Run** to execute the schema

### 1.2 Verify Tables Created
Check that these tables were created:
- ✅ `users_index`
- ✅ `restaurant_profile` 
- ✅ `restaurant_profile_users`

## Step 2: Environment Configuration

### 2.1 Update Environment Variables
Ensure your `.env.local` file has:
```env
REACT_APP_SUPABASE_URL=your-supabase-project-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2.2 Verify Supabase Connection
1. Start your app: `npm start`
2. Check browser console for Supabase connection logs
3. Look for: "🚀 Supabase initialized successfully"

## Step 3: Developer Account Setup

### 3.1 Create Developer Account
The schema automatically creates a developer restaurant profile for `sura.resto.biz@gmail.com`.

### 3.2 Test Developer Login
1. Try logging in with `sura.resto.biz@gmail.com`
2. If account doesn't exist, create it through Supabase Auth:
   - Go to **Authentication > Users** in Supabase dashboard
   - Click **Add user**
   - Email: `sura.resto.biz@gmail.com`
   - Password: Set a secure password
   - Confirm email: Yes

### 3.3 Verify Developer Features
After login, check for:
- ✅ Orange "DEVELOPER" badge in UI
- ✅ No subscription warnings
- ✅ Full access to all features
- ✅ Can add managers without limits

## Step 4: Regular User Testing

### 4.1 Test Regular Account (No Subscription)
1. Create a test account with any other email
2. Login and verify:
   - ❌ Gets blocked by subscription gate
   - ❌ Sees "Subscription Required" message
   - ❌ Cannot access dashboard features

### 4.2 Test Regular Account (With Subscription)
1. In Supabase dashboard, go to **Table Editor > restaurant_profile**
2. Find your test restaurant
3. Update these fields:
   ```sql
   subscription_status = 'active'
   payment_captured_at = NOW()
   subscription_start_date = NOW()
   subscription_end_date = NOW() + INTERVAL '30 days'
   ```
4. Login and verify:
   - ✅ Full access to features
   - ✅ Can add managers (up to 2)
   - ✅ No subscription warnings

## Step 5: User Management Testing

### 5.1 Test Manager Creation
1. Login as owner (with active subscription)
2. Go to User Management section
3. Click "Add Manager"
4. Fill in manager details
5. Verify:
   - ✅ Manager created successfully
   - ✅ Manager can login with credentials
   - ✅ Manager has appropriate access

### 5.2 Test Manager Limits
1. Try creating more than 2 managers
2. Verify:
   - ❌ Gets blocked at 2 manager limit
   - ❌ Shows appropriate error message

### 5.3 Test Manager Status Toggle
1. Toggle manager active/inactive status
2. Verify:
   - ✅ Status updates correctly
   - ✅ Inactive managers can't login
   - ✅ Respects 2-manager limit when activating

## Step 6: Subscription Enforcement Testing

### 6.1 Test Subscription Expiry
1. Set `subscription_end_date` to past date
2. Set `subscription_status` to 'expired'
3. Login as owner:
   - ❌ Gets blocked by subscription gate
   - ❌ Sees renewal message
4. Login as manager under expired restaurant:
   - ❌ Gets automatically logged out
   - ❌ Redirected to login page

### 6.2 Test Real-time Updates
1. While logged in, update subscription in database
2. Verify:
   - ✅ Status updates automatically
   - ✅ Access granted/blocked immediately
   - ✅ No need to refresh page

## Step 7: Production Deployment

### 7.1 Database Optimization
1. Review and adjust RLS policies if needed
2. Set up database backups
3. Monitor performance with indexes

### 7.2 Security Checklist
- ✅ RLS enabled on all tables
- ✅ Proper policies for data access
- ✅ Environment variables secured
- ✅ Developer account limited to specific email

### 7.3 Monitoring Setup
1. Set up Supabase monitoring
2. Monitor auth events
3. Track subscription status changes
4. Monitor user creation/deletion

## Troubleshooting

### Issue: Tables not created
**Solution**: 
- Check SQL execution for errors
- Verify Supabase project permissions
- Try running schema in smaller chunks

### Issue: Developer account not working
**Solution**:
- Verify email is exactly `sura.resto.biz@gmail.com`
- Check user exists in Supabase Auth
- Verify restaurant_profile entry exists

### Issue: Regular users not blocked
**Solution**:
- Check subscription_status in database
- Verify payment_captured_at field
- Ensure SubscriptionGate is working

### Issue: Manager creation fails
**Solution**:
- Check Supabase Auth settings
- Verify email confirmation settings
- Check database table permissions

### Issue: Real-time updates not working
**Solution**:
- Check Supabase realtime settings
- Verify subscription context setup
- Check browser console for errors

## Database Schema Reference

### users_index
Maps Supabase Auth users to restaurants
```sql
user_id UUID (FK to auth.users)
restaurant_id UUID (FK to restaurant_profile)
```

### restaurant_profile
Main restaurant information and subscription data
```sql
restaurant_name VARCHAR(255)
owner_email VARCHAR(255) UNIQUE
subscription_status VARCHAR(20)
payment_captured_at TIMESTAMP
```

### restaurant_profile_users
User roles and permissions within restaurants
```sql
user_id UUID (FK to auth.users)
restaurant_id UUID (FK to restaurant_profile)
role VARCHAR(20) -- 'owner' or 'manager'
is_active BOOLEAN
```

## Success Criteria

✅ **Developer Account**: Unlimited access with badge
✅ **Regular Accounts**: Properly blocked without payment
✅ **Manager Creation**: Works with 2-manager limit
✅ **Subscription Enforcement**: Real-time blocking
✅ **Database Schema**: All tables and policies working
✅ **Real-time Updates**: Immediate status changes

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Supabase logs in dashboard
3. Check browser console for errors
4. Verify database schema is correctly applied

Your SURA Restaurant Management System is now ready for production with full Supabase integration! 🎉