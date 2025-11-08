-- =====================================================
-- SURA RESTAURANT MANAGEMENT - FIX CURRENT SCHEMA
-- This script fixes your existing schema to work with the app
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ADD MISSING COLUMNS
-- =====================================================

-- Add is_active column to restaurant_profile_users (CRITICAL for app)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurant_profile_users' 
                   AND column_name = 'is_active') THEN
        ALTER TABLE public.restaurant_profile_users ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added is_active column to restaurant_profile_users';
    ELSE
        RAISE NOTICE '✅ Column is_active already exists in restaurant_profile_users';
    END IF;
END $$;

-- Add created_by column to restaurant_profile_users
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurant_profile_users' 
                   AND column_name = 'created_by') THEN
        ALTER TABLE public.restaurant_profile_users ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE '✅ Added created_by column to restaurant_profile_users';
    ELSE
        RAISE NOTICE '✅ Column created_by already exists in restaurant_profile_users';
    END IF;
END $$;

-- Add updated_at column to restaurant_profile_users
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurant_profile_users' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.restaurant_profile_users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at column to restaurant_profile_users';
    ELSE
        RAISE NOTICE '✅ Column updated_at already exists in restaurant_profile_users';
    END IF;
END $$;

-- Add last_login column to restaurant_profile_users
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurant_profile_users' 
                   AND column_name = 'last_login') THEN
        ALTER TABLE public.restaurant_profile_users ADD COLUMN last_login TIMESTAMPTZ;
        RAISE NOTICE '✅ Added last_login column to restaurant_profile_users';
    ELSE
        RAISE NOTICE '✅ Column last_login already exists in restaurant_profile_users';
    END IF;
END $$;

-- Add is_active column to users_index
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users_index' 
                   AND column_name = 'is_active') THEN
        ALTER TABLE public.users_index ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added is_active column to users_index';
    ELSE
        RAISE NOTICE '✅ Column is_active already exists in users_index';
    END IF;
END $$;

-- Add updated_at column to users_index
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users_index' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.users_index ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at column to users_index';
    ELSE
        RAISE NOTICE '✅ Column updated_at already exists in users_index';
    END IF;
END $$;

-- =====================================================
-- 2. UPDATE ROLE CONSTRAINTS (Remove 'staff', keep only 'owner' and 'manager')
-- =====================================================

-- Update restaurant_profile_users role constraint
DO $$
BEGIN
    -- Drop existing constraint
    ALTER TABLE public.restaurant_profile_users DROP CONSTRAINT IF EXISTS restaurant_profile_users_role_check;
    
    -- Add new constraint with only owner and manager
    ALTER TABLE public.restaurant_profile_users ADD CONSTRAINT restaurant_profile_users_role_check 
    CHECK (role IN ('owner', 'manager'));
    
    RAISE NOTICE '✅ Updated restaurant_profile_users role constraint to owner/manager only';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not update restaurant_profile_users role constraint: %', SQLERRM;
END $$;

-- Update users_index role constraint
DO $$
BEGIN
    -- Drop existing constraint
    ALTER TABLE public.users_index DROP CONSTRAINT IF EXISTS users_index_role_check;
    
    -- Add new constraint with only owner and manager
    ALTER TABLE public.users_index ADD CONSTRAINT users_index_role_check 
    CHECK (role IN ('owner', 'manager'));
    
    RAISE NOTICE '✅ Updated users_index role constraint to owner/manager only';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not update users_index role constraint: %', SQLERRM;
END $$;

-- =====================================================
-- 3. ADD CRITICAL POLICY FOR OWNER TO MANAGE MANAGERS
-- =====================================================

-- This policy allows owners to create, read, update, and delete managers in their restaurant
DO $$ 
BEGIN
    CREATE POLICY "Owners can manage restaurant users" ON "public"."restaurant_profile_users" AS PERMISSIVE 
    FOR ALL TO public USING (
        EXISTS (
            SELECT 1 FROM restaurant_profile_users rpu
            WHERE rpu.user_id = auth.uid() 
            AND rpu.restaurant_id = restaurant_profile_users.restaurant_id
            AND rpu.role = 'owner'
            AND rpu.is_active = true
        )
    );
    RAISE NOTICE '✅ Added owner management policy for restaurant_profile_users';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE '✅ Owner management policy already exists for restaurant_profile_users';
END $$;

-- Add similar policy for users_index
DO $$ 
BEGIN
    CREATE POLICY "Owners can manage users index" ON "public"."users_index" AS PERMISSIVE 
    FOR ALL TO public USING (
        EXISTS (
            SELECT 1 FROM restaurant_profile_users rpu
            WHERE rpu.user_id = auth.uid() 
            AND rpu.restaurant_id = users_index.restaurant_id
            AND rpu.role = 'owner'
            AND rpu.is_active = true
        )
    );
    RAISE NOTICE '✅ Added owner management policy for users_index';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE '✅ Owner management policy already exists for users_index';
END $$;

-- =====================================================
-- 4. UPDATE MANAGER LIMIT TRIGGER (Only count active managers)
-- =====================================================

-- Update the trigger function to only count active managers
CREATE OR REPLACE FUNCTION enforce_max_two_managers()
RETURNS TRIGGER AS $$
DECLARE
    manager_count INT;
BEGIN
    -- Only count ACTIVE managers
    SELECT COUNT(*) INTO manager_count
    FROM public.restaurant_profile_users
    WHERE restaurant_id = NEW.restaurant_id
    AND role = 'manager'
    AND is_active = true;  -- Only count active managers
    
    IF manager_count >= 2 AND NEW.role = 'manager' AND NEW.is_active = true THEN
        RAISE EXCEPTION 'A restaurant can only have up to 2 active managers';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

RAISE NOTICE '✅ Updated manager limit trigger to only count active managers';

-- =====================================================
-- 5. SET DEFAULT VALUES FOR EXISTING RECORDS
-- =====================================================

-- Set is_active = true for existing records
UPDATE public.restaurant_profile_users SET is_active = true WHERE is_active IS NULL;
UPDATE public.users_index SET is_active = true WHERE is_active IS NULL;

-- Set updated_at = created_at for existing records
UPDATE public.restaurant_profile_users SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE public.users_index SET updated_at = created_at WHERE updated_at IS NULL;

RAISE NOTICE '✅ Updated existing records with default values';

-- =====================================================
-- 6. ADD INDEXES FOR PERFORMANCE
-- =====================================================

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_restaurant_profile_users_active ON restaurant_profile_users(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurant_profile_users_created_by ON restaurant_profile_users(created_by);
CREATE INDEX IF NOT EXISTS idx_users_index_active ON users_index(is_active);

RAISE NOTICE '✅ Added performance indexes';

-- =====================================================
-- 7. ADD TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Add triggers for updated_at
DO $$ 
BEGIN
    CREATE TRIGGER update_restaurant_profile_users_updated_at 
    BEFORE UPDATE ON restaurant_profile_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✅ Added updated_at trigger for restaurant_profile_users';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE '✅ Updated_at trigger already exists for restaurant_profile_users';
END $$;

DO $$ 
BEGIN
    CREATE TRIGGER update_users_index_updated_at 
    BEFORE UPDATE ON users_index 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE '✅ Added updated_at trigger for users_index';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE '✅ Updated_at trigger already exists for users_index';
END $$;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

SELECT '🎉 Schema fix completed successfully! Your app can now create managers.' as status;