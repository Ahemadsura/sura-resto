# 🔒 Subscription System Testing Guide

## Overview
The SURA Restaurant Management System now has strict subscription enforcement with a special developer account bypass.

## Developer Account
- **Email**: `sura.resto.biz@gmail.com`
- **Status**: Unlimited access, no subscription restrictions
- **Badge**: Shows "DEVELOPER" badge in the UI
- **Behavior**: Always treated as having an active subscription

## Regular User Accounts
All other email addresses are subject to strict subscription enforcement:

### Subscription States
1. **Active**: User has paid and subscription is valid
2. **Expiring**: Less than 7 days remaining (warning shown)
3. **Expired**: No payment or subscription expired (access blocked)

## Testing Scenarios

### 1. Developer Account Testing
```
Email: sura.resto.biz@gmail.com
Expected Behavior:
✅ Can login without any subscription checks
✅ Shows "DEVELOPER" badge in UI
✅ Full access to all features
✅ No subscription warnings or blocks
✅ Can add managers without limits
```

### 2. Regular Owner Account - No Subscription
```
Email: any-other-email@example.com
Expected Behavior:
❌ Gets blocked by SubscriptionGate
❌ Sees subscription required message
❌ Cannot access dashboard features
❌ Must complete payment to proceed
```

### 3. Regular Owner Account - Active Subscription
```
Email: any-other-email@example.com
With valid payment_captured_at in database
Expected Behavior:
✅ Can access all owner features
✅ Can add managers (up to 2)
✅ No subscription warnings
```

### 4. Regular Owner Account - Expiring Subscription
```
Email: any-other-email@example.com
With payment_captured_at < 7 days from expiry
Expected Behavior:
⚠️ Shows expiring warning
✅ Still has access to features
⚠️ Prompted to renew soon
```

### 5. Manager Account - Expired Subscription
```
Any manager under expired restaurant
Expected Behavior:
❌ Automatically logged out
❌ Redirected to login page
❌ Cannot access any features
```

## Database Schema Requirements

### restaurant_profile table
```sql
-- Required fields for subscription logic
subscription_status: 'trial' | 'active' | 'expired' | 'cancelled'
subscription_plan: 'basic' | 'premium' etc.
payment_captured_at: TIMESTAMP (when payment was successful)
subscription_start_date: TIMESTAMP
subscription_end_date: TIMESTAMP (calculated as payment_captured_at + 30 days)
```

### Subscription Logic
```
Active Subscription = 
  subscription_status = 'active' 
  AND payment_captured_at IS NOT NULL 
  AND current_date <= (payment_captured_at + 30 days)
```

## Testing Steps

### Step 1: Test Developer Account
1. Login with `sura.resto.biz@gmail.com`
2. Verify "DEVELOPER" badge appears
3. Check all features are accessible
4. Verify no subscription prompts

### Step 2: Test Regular Account Without Payment
1. Login with any other email
2. Verify subscription gate blocks access
3. Check subscription required message appears
4. Verify logout button works

### Step 3: Test Regular Account With Payment
1. Update database: Set `payment_captured_at` to recent date
2. Set `subscription_status` to 'active'
3. Login and verify full access
4. Check subscription status shows as active

### Step 4: Test Manager Under Expired Restaurant
1. Create manager under restaurant with expired subscription
2. Login as manager
3. Verify automatic logout occurs
4. Check redirection to login page

## Database Updates for Testing

### Make Account Active (SQL)
```sql
UPDATE restaurant_profile 
SET 
  subscription_status = 'active',
  payment_captured_at = NOW(),
  subscription_start_date = NOW(),
  subscription_end_date = NOW() + INTERVAL '30 days'
WHERE owner_email = 'test@example.com';
```

### Make Account Expired (SQL)
```sql
UPDATE restaurant_profile 
SET 
  subscription_status = 'expired',
  payment_captured_at = NULL
WHERE owner_email = 'test@example.com';
```

## Expected UI Elements

### Developer Account
- Orange "DEVELOPER" badge in sidebar/header
- No subscription warnings
- Full feature access

### Active Subscription
- Green subscription status
- Days remaining counter
- Full feature access

### Expiring Subscription (< 7 days)
- Yellow/orange warning
- Renewal prompts
- Still functional

### Expired Subscription
- Red error messages
- Blurred/blocked interface
- Subscription management form
- Logout option only

## Troubleshooting

### Issue: Developer account not working
- Check email is exactly `sura.resto.biz@gmail.com`
- Verify SupabaseAuthContext is being used
- Check isDeveloperAccount logic

### Issue: Regular users not blocked
- Verify subscription_status in database
- Check payment_captured_at field
- Ensure SubscriptionGate is wrapping components

### Issue: Managers not logged out
- Check App.tsx ProtectedRoute logic
- Verify subscription context is working
- Check manager role detection

## Security Notes
- Developer bypass only works for specific email
- All other accounts strictly enforced
- Subscription checks happen on every route
- Real-time updates when subscription changes
- Managers immediately blocked when subscription expires

## Success Criteria
✅ Developer account has unlimited access
✅ Regular accounts blocked without payment
✅ Subscription expiry properly calculated
✅ Managers logged out when subscription expires
✅ UI clearly shows subscription status
✅ Real-time subscription updates work