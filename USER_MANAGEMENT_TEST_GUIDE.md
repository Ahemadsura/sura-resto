# 🧪 User Management Testing Guide

## Overview
This guide helps you test the complete User Management functionality for SURA Restaurant Management System.

## Prerequisites
- ✅ Supabase database schema applied (`scripts/setup-supabase-schema.sql`)
- ✅ Owner account logged in
- ✅ Restaurant profile exists in database

## Test Scenarios

### 1. Access Control Testing

#### Test 1.1: Owner Access
```
Login as: Restaurant Owner
Expected: ✅ Can see "User Management" section in dashboard
Expected: ✅ Can view all users in restaurant
Expected: ✅ Can add/delete managers
```

#### Test 1.2: Manager Access
```
Login as: Manager
Expected: ❌ Cannot see "User Management" section
Expected: ❌ No access to user management features
```

### 2. Manager Creation Testing

#### Test 2.1: Add First Manager
```
Steps:
1. Click "Add Manager" button
2. Fill form:
   - Manager Name: "John Smith"
   - Manager Email: "john@example.com"
   - Password: "SecurePass123!"
3. Click "Add Manager"

Expected Results:
✅ Manager created successfully
✅ Manager appears in users table
✅ Manager can login with provided credentials
✅ Counter shows "Active Managers: 1/2"
```

#### Test 2.2: Add Second Manager
```
Steps:
1. Click "Add Manager" button
2. Fill form:
   - Manager Name: "Jane Doe"
   - Manager Email: "jane@example.com"
   - Password: "AnotherPass456!"
3. Click "Add Manager"

Expected Results:
✅ Second manager created successfully
✅ Both managers appear in table
✅ Counter shows "Active Managers: 2/2"
✅ "Add Manager" button becomes disabled
✅ Button text changes to "Manager Limit Reached"
```

#### Test 2.3: Try Adding Third Manager
```
Steps:
1. Try to click "Add Manager" button

Expected Results:
❌ Button is disabled
❌ Tooltip shows "Maximum 2 managers allowed"
❌ Cannot open add manager dialog
```

### 3. Manager Deletion Testing

#### Test 3.1: Delete Manager
```
Steps:
1. Find a manager in the users table
2. Click "Remove" button
3. Confirm deletion in popup

Expected Results:
✅ Manager removed from table
✅ Manager cannot login anymore
✅ Counter updates (e.g., "Active Managers: 1/2")
✅ "Add Manager" button becomes enabled again
```

#### Test 3.2: Try Deleting Owner
```
Steps:
1. Look at owner row in users table

Expected Results:
❌ No "Remove" button for owner
✅ Shows "Owner" text instead of action buttons
```

### 4. Form Validation Testing

#### Test 4.1: Email Validation
```
Test Cases:
- Empty email: ❌ "Email is required"
- Invalid format: ❌ "Please enter a valid email address"
- Existing email: ❌ "A user with this email already exists"
- Valid email: ✅ No error
```

#### Test 4.2: Password Validation
```
Test Cases:
- Empty password: ❌ "Password is required"
- Too short: ❌ "Password must be at least 8 characters long"
- No uppercase: ❌ "Password must contain at least one uppercase letter"
- No lowercase: ❌ "Password must contain at least one lowercase letter"
- No number: ❌ "Password must contain at least one number"
- No special char: ❌ "Password must contain at least one special character"
- Valid password: ✅ No error
```

#### Test 4.3: Name Validation
```
Test Cases:
- Empty name: ❌ "Name is required"
- Too short: ❌ "Name must be at least 2 characters long"
- Too long: ❌ "Name must be less than 50 characters"
- Invalid chars: ❌ "Name can only contain letters, numbers, spaces, hyphens, and apostrophes"
- Valid name: ✅ No error
```

### 5. Database Integration Testing

#### Test 5.1: Verify Database Records
```
After adding a manager, check Supabase dashboard:

users_index table:
✅ New record with user_id and restaurant_id

restaurant_profile_users table:
✅ New record with:
   - user_id (matches auth.users)
   - restaurant_id (matches owner's restaurant)
   - email (matches form input)
   - display_name (matches form input)
   - role = 'manager'
   - is_active = true
   - created_by (owner's user_id)

auth.users table:
✅ New user record with email and encrypted password
```

#### Test 5.2: Verify Deletion Cleanup
```
After deleting a manager, check Supabase dashboard:

users_index table:
❌ Record removed

restaurant_profile_users table:
❌ Record removed

auth.users table:
❌ User record removed (or disabled)
```

### 6. Real-time Updates Testing

#### Test 6.1: Multiple Browser Windows
```
Steps:
1. Open app in two browser windows
2. Login as same owner in both
3. Add manager in window 1
4. Check window 2

Expected:
✅ Manager appears in both windows
✅ Counter updates in both windows
✅ Button states sync across windows
```

### 7. Error Handling Testing

#### Test 7.1: Network Errors
```
Steps:
1. Disconnect internet
2. Try to add manager
3. Reconnect internet

Expected:
❌ Shows appropriate error message
✅ Form data preserved
✅ Can retry after reconnection
```

#### Test 7.2: Database Errors
```
Steps:
1. Temporarily break database connection
2. Try to add manager

Expected:
❌ Shows clear error message
❌ Manager not added to UI
✅ System remains stable
```

## Success Criteria

### ✅ User Interface
- Owner can access User Management section
- Clean table showing all users with proper columns
- Add Manager button with proper states
- Remove buttons only for managers
- Form validation with clear error messages

### ✅ Functionality
- Can add managers (max 2)
- Can delete managers
- Manager limit properly enforced
- Form validation works correctly
- Real-time updates across sessions

### ✅ Security
- Only owners can manage users
- Managers cannot access user management
- Proper database permissions (RLS)
- Secure password handling

### ✅ Database Integration
- Records created in correct tables
- Proper cleanup on deletion
- Foreign key relationships maintained
- Auth users properly managed

## Troubleshooting

### Issue: "Add Manager" button not working
**Check:**
- User is logged in as owner
- Restaurant ID is properly set
- Database schema is applied
- RLS policies are active

### Issue: Manager limit not enforced
**Check:**
- Database query for counting managers
- Frontend logic for button states
- Manager count calculation

### Issue: Manager cannot login after creation
**Check:**
- Auth user was created successfully
- Email confirmation settings in Supabase
- Password meets requirements
- User record exists in auth.users

### Issue: Delete not working
**Check:**
- RLS policies allow deletion
- User has owner permissions
- Database foreign key constraints
- Auth user deletion permissions

## Database Queries for Testing

### Check Manager Count
```sql
SELECT COUNT(*) as manager_count
FROM restaurant_profile_users 
WHERE restaurant_id = 'your-restaurant-id' 
AND role = 'manager';
```

### List All Users in Restaurant
```sql
SELECT rpu.*, au.email as auth_email
FROM restaurant_profile_users rpu
JOIN auth.users au ON rpu.user_id = au.id
WHERE rpu.restaurant_id = 'your-restaurant-id'
ORDER BY rpu.created_at DESC;
```

### Check RLS Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'restaurant_profile_users';
```

Your User Management system is now fully tested and ready for production! 🎉