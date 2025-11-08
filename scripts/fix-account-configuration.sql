-- =====================================================
-- SURA RESTAURANT MANAGEMENT - FIX ACCOUNT CONFIGURATION
-- Run this to fix "Account configuration error" for any user
-- =====================================================

-- This script fixes users who exist in Supabase Auth but are missing from database tables
-- You need to be logged in as the user you want to fix when running this script

-- Check current user
SELECT 
    'Current user check:' as status,
    auth.uid() as user_id,
    auth.jwt() ->> 'email' as email;

-- Step 1: Check if user has a restaurant profile
DO $$
DECLARE
    user_email TEXT;
    user_id UUID;
    restaurant_exists BOOLEAN;
BEGIN
    -- Get current user info
    user_id := auth.uid();
    user_email := auth.jwt() ->> 'email';
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user found. Please log in first.';
    END IF;
    
    -- Check if restaurant profile exists
    SELECT EXISTS(
        SELECT 1 FROM public.restaurant_profile 
        WHERE owner_email = user_email OR owner_user_id = user_id
    ) INTO restaurant_exists;
    
    IF NOT restaurant_exists THEN
        -- Create restaurant profile
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
        ) VALUES (
            COALESCE(auth.jwt() ->> 'user_metadata'->>'display_name', 'Restaurant Owner') || '''s Restaurant',
            user_email,
            COALESCE(auth.jwt() ->> 'user_metadata'->>'display_name', 'Restaurant Owner'),
            user_id,
            'active',
            CASE 
                WHEN user_email = 'sura.resto.biz@gmail.com' THEN 'enterprise'::plan_type
                ELSE 'starter'::plan_type
            END,
            NOW(),
            'active',
            NOW(),
            NOW() + INTERVAL '1 year'
        );
        
        RAISE NOTICE 'Created restaurant profile for user: %', user_email;
    ELSE
        RAISE NOTICE 'Restaurant profile already exists for user: %', user_email;
    END IF;
END $$;

-- Step 2: Add user to users_index if missing
DO $$
DECLARE
    user_email TEXT;
    user_id UUID;
    restaurant_id UUID;
    index_exists BOOLEAN;
BEGIN
    -- Get current user info
    user_id := auth.uid();
    user_email := auth.jwt() ->> 'email';
    
    -- Get restaurant ID
    SELECT id INTO restaurant_id 
    FROM public.restaurant_profile 
    WHERE owner_email = user_email OR owner_user_id = user_id
    LIMIT 1;
    
    -- Check if users_index record exists
    SELECT EXISTS(
        SELECT 1 FROM public.users_index WHERE user_id = user_id
    ) INTO index_exists;
    
    IF NOT index_exists THEN
        -- Create users_index record
        INSERT INTO public.users_index (
            user_id,
            email,
            restaurant_id,
            role,
            display_name,
            plan,
            is_active
        ) VALUES (
            user_id,
            user_email,
            restaurant_id,
            'owner',
            COALESCE(auth.jwt() ->> 'user_metadata'->>'display_name', 'Restaurant Owner'),
            CASE 
                WHEN user_email = 'sura.resto.biz@gmail.com' THEN 'enterprise'::plan_type
                ELSE 'starter'::plan_type
            END,
            true
        );
        
        RAISE NOTICE 'Created users_index record for user: %', user_email;
    ELSE
        RAISE NOTICE 'users_index record already exists for user: %', user_email;
    END IF;
END $$;

-- Step 3: Add user to restaurant_profile_users if missing
DO $$
DECLARE
    user_email TEXT;
    user_id UUID;
    restaurant_id UUID;
    profile_exists BOOLEAN;
BEGIN
    -- Get current user info
    user_id := auth.uid();
    user_email := auth.jwt() ->> 'email';
    
    -- Get restaurant ID
    SELECT id INTO restaurant_id 
    FROM public.restaurant_profile 
    WHERE owner_email = user_email OR owner_user_id = user_id
    LIMIT 1;
    
    -- Check if restaurant_profile_users record exists
    SELECT EXISTS(
        SELECT 1 FROM public.restaurant_profile_users WHERE user_id = user_id
    ) INTO profile_exists;
    
    IF NOT profile_exists THEN
        -- Create restaurant_profile_users record
        INSERT INTO public.restaurant_profile_users (
            user_id,
            restaurant_id,
            email,
            display_name,
            role,
            plan,
            is_active,
            created_by
        ) VALUES (
            user_id,
            restaurant_id,
            user_email,
            COALESCE(auth.jwt() ->> 'user_metadata'->>'display_name', 'Restaurant Owner'),
            'owner',
            CASE 
                WHEN user_email = 'sura.resto.biz@gmail.com' THEN 'enterprise'::plan_type
                ELSE 'starter'::plan_type
            END,
            true,
            user_id
        );
        
        RAISE NOTICE 'Created restaurant_profile_users record for user: %', user_email;
    ELSE
        RAISE NOTICE 'restaurant_profile_users record already exists for user: %', user_email;
    END IF;
END $$;

-- Final verification
SELECT 
    'Account setup verification:' as status,
    auth.uid() as user_id,
    auth.jwt() ->> 'email' as email,
    (SELECT COUNT(*) FROM public.restaurant_profile WHERE owner_user_id = auth.uid()) as restaurant_profiles,
    (SELECT COUNT(*) FROM public.users_index WHERE user_id = auth.uid()) as users_index_records,
    (SELECT COUNT(*) FROM public.restaurant_profile_users WHERE user_id = auth.uid()) as profile_users_records;

SELECT 'Account configuration fixed successfully! You can now log in.' as result;