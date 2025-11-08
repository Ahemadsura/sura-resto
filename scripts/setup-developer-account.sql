-- =====================================================
-- SURA RESTAURANT MANAGEMENT - DEVELOPER ACCOUNT SETUP
-- Run this to fix "Account configuration error" for developer account
-- =====================================================

-- First, let's check if the developer user exists in auth.users
-- You need to replace 'YOUR_DEVELOPER_USER_ID' with the actual UUID from Supabase Auth dashboard

-- Step 1: Create restaurant profile for developer (if not exists)
INSERT INTO public.restaurant_profile (
    name, 
    owner_email, 
    owner_name, 
    owner_user_id,
    status,
    plan,
    payment_captured_at,
    subscription_status,
    subscription_start_date,
    subscription_end_date
) 
SELECT 
    'SURA Developer Restaurant',
    'sura.resto.biz@gmail.com',
    'SURA Developer',
    auth.uid(), -- This will use the currently logged in user's ID
    'active',
    'enterprise',
    NOW(),
    'active',
    NOW(),
    NOW() + INTERVAL '1 year'
WHERE NOT EXISTS (
    SELECT 1 FROM public.restaurant_profile WHERE owner_email = 'sura.resto.biz@gmail.com'
);

-- Step 2: Get the restaurant ID for the developer
-- (This will be used in the next steps)

-- Step 3: Add developer to users_index (if not exists)
INSERT INTO public.users_index (
    user_id,
    email,
    restaurant_id,
    role,
    display_name,
    plan,
    is_active
)
SELECT 
    auth.uid(),
    'sura.resto.biz@gmail.com',
    rp.id,
    'owner',
    'SURA Developer',
    'enterprise',
    true
FROM public.restaurant_profile rp
WHERE rp.owner_email = 'sura.resto.biz@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.users_index WHERE user_id = auth.uid()
);

-- Step 4: Add developer to restaurant_profile_users (if not exists)
INSERT INTO public.restaurant_profile_users (
    user_id,
    restaurant_id,
    email,
    display_name,
    role,
    plan,
    is_active,
    created_by
)
SELECT 
    auth.uid(),
    rp.id,
    'sura.resto.biz@gmail.com',
    'SURA Developer',
    'owner',
    'enterprise',
    true,
    auth.uid()
FROM public.restaurant_profile rp
WHERE rp.owner_email = 'sura.resto.biz@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.restaurant_profile_users WHERE user_id = auth.uid()
);

-- Verification query - run this to check if everything is set up correctly
SELECT 
    'Setup verification:' as status,
    (SELECT COUNT(*) FROM public.restaurant_profile WHERE owner_email = 'sura.resto.biz@gmail.com') as restaurant_profiles,
    (SELECT COUNT(*) FROM public.users_index WHERE email = 'sura.resto.biz@gmail.com') as users_index_records,
    (SELECT COUNT(*) FROM public.restaurant_profile_users WHERE email = 'sura.resto.biz@gmail.com') as profile_users_records;

-- If all counts are 1, the setup is complete!