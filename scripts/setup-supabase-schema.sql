-- =====================================================
-- SURA RESTAURANT MANAGEMENT - UNIFIED SUPABASE SCHEMA
-- Compatible with existing website schema + desktop app enhancements
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Extension for UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enum for subscription plan (matching your website)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type typ JOIN pg_namespace nsp ON nsp.oid = typ.typnamespace WHERE nsp.nspname = 'public' AND typ.typname = 'plan_type') THEN
        CREATE TYPE plan_type AS ENUM ('starter', 'pro', 'enterprise');
    END IF;
END $$;

-- =====================================================
-- 1. RESTAURANT PROFILE TABLE (Main restaurant data)
-- Compatible with your existing website schema
-- =====================================================
CREATE TABLE IF NOT EXISTS public.restaurant_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Payment fields (from your website)
    payment_amount BIGINT,
    payment_captured_at TIMESTAMPTZ,
    payment_currency TEXT,
    payment_order_id TEXT,
    payment_id TEXT,
    payment_provider TEXT,
    
    -- Subscription plan (from your website)
    plan plan_type NOT NULL DEFAULT 'starter',
    
    -- Additional fields for enhanced functionality
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    
    -- Enhanced subscription tracking
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
    subscription_start_date TIMESTAMPTZ,
    subscription_end_date TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(owner_email)
);

-- =====================================================
-- 2. RESTAURANT PROFILE USERS TABLE (User roles and permissions)
-- Compatible with your existing website schema + enhancements
-- =====================================================
CREATE TABLE IF NOT EXISTS public.restaurant_profile_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurant_profile(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager')),
    plan plan_type NOT NULL DEFAULT 'starter',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Enhanced fields for desktop app
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(restaurant_id, user_id),
    UNIQUE(email, restaurant_id)
);

-- =====================================================
-- 3. USERS INDEX TABLE (Fast lookup table)
-- Compatible with your existing website schema + enhancements
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users_index (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    restaurant_id UUID NOT NULL REFERENCES public.restaurant_profile(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager')),
    display_name TEXT,
    plan plan_type NOT NULL DEFAULT 'starter',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Enhanced fields
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. SCHEMA MIGRATIONS (Add missing columns if needed)
-- =====================================================

-- Add is_active column to restaurant_profile_users if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurant_profile_users' 
                   AND column_name = 'is_active') THEN
        ALTER TABLE public.restaurant_profile_users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add created_by column to restaurant_profile_users if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurant_profile_users' 
                   AND column_name = 'created_by') THEN
        ALTER TABLE public.restaurant_profile_users ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add updated_at column to restaurant_profile_users if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurant_profile_users' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.restaurant_profile_users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Add last_login column to restaurant_profile_users if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurant_profile_users' 
                   AND column_name = 'last_login') THEN
        ALTER TABLE public.restaurant_profile_users ADD COLUMN last_login TIMESTAMPTZ;
    END IF;
END $$;

-- Add is_active column to users_index if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users_index' 
                   AND column_name = 'is_active') THEN
        ALTER TABLE public.users_index ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add updated_at column to users_index if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users_index' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.users_index ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Compatible with your existing website + enhanced for desktop app
-- =====================================================

-- Enable RLS
ALTER TABLE public.restaurant_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_profile_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_index ENABLE ROW LEVEL SECURITY;

-- Restaurant Profile Policies (from your website)
DO $$ BEGIN
    CREATE POLICY "Users can read own restaurant profile by user id" ON "public"."restaurant_profile" AS PERMISSIVE 
    FOR SELECT TO public USING (auth.uid() = owner_user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can read own restaurant profile by email" ON "public"."restaurant_profile" AS PERMISSIVE 
    FOR SELECT TO public USING (auth.jwt() ->> 'email' = owner_email);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own restaurant profile" ON "public"."restaurant_profile" AS PERMISSIVE 
    FOR INSERT TO public WITH CHECK (auth.uid() = owner_user_id AND auth.jwt() ->> 'email' = owner_email);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own restaurant profile" ON "public"."restaurant_profile" AS PERMISSIVE 
    FOR UPDATE TO public USING (auth.uid() = owner_user_id OR auth.jwt() ->> 'email' = owner_email) 
    WITH CHECK (auth.uid() = owner_user_id AND auth.jwt() ->> 'email' = owner_email);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Restaurant Profile Users Policies (from your website + enhancements)
DO $$ BEGIN
    CREATE POLICY "Users can read own restaurant profile users" ON "public"."restaurant_profile_users" AS PERMISSIVE 
    FOR SELECT TO public USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own restaurant profile users" ON "public"."restaurant_profile_users" AS PERMISSIVE 
    FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own restaurant profile users" ON "public"."restaurant_profile_users" AS PERMISSIVE 
    FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enhanced policy for owners to manage managers/staff
DO $$ BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Users Index Policies (from your website)
DO $$ BEGIN
    CREATE POLICY "Users can read own user index" ON "public"."users_index" AS PERMISSIVE 
    FOR SELECT TO public USING (auth.jwt() ->> 'email' = email);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own user index" ON "public"."users_index" AS PERMISSIVE 
    FOR INSERT TO public WITH CHECK (auth.jwt() ->> 'email' = email);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own user index" ON "public"."users_index" AS PERMISSIVE 
    FOR UPDATE TO public USING (auth.jwt() ->> 'email' = email) WITH CHECK (auth.jwt() ->> 'email' = email);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 6. PERFORMANCE INDEXES
-- =====================================================

-- Indexes for users_index
CREATE INDEX IF NOT EXISTS idx_users_index_user_id ON users_index(user_id);
CREATE INDEX IF NOT EXISTS idx_users_index_restaurant_id ON users_index(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_users_index_email ON users_index(email);
CREATE INDEX IF NOT EXISTS idx_users_index_role ON users_index(role);

-- Indexes for restaurant_profile
CREATE INDEX IF NOT EXISTS idx_restaurant_profile_owner_user_id ON restaurant_profile(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_profile_owner_email ON restaurant_profile(owner_email);
CREATE INDEX IF NOT EXISTS idx_restaurant_profile_status ON restaurant_profile(status);
CREATE INDEX IF NOT EXISTS idx_restaurant_profile_plan ON restaurant_profile(plan);
CREATE INDEX IF NOT EXISTS idx_restaurant_profile_payment_captured ON restaurant_profile(payment_captured_at);

-- Indexes for restaurant_profile_users
CREATE INDEX IF NOT EXISTS idx_restaurant_profile_users_user_id ON restaurant_profile_users(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_profile_users_restaurant_id ON restaurant_profile_users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_profile_users_email ON restaurant_profile_users(email);
CREATE INDEX IF NOT EXISTS idx_restaurant_profile_users_role ON restaurant_profile_users(role);
CREATE INDEX IF NOT EXISTS idx_restaurant_profile_users_active ON restaurant_profile_users(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurant_profile_users_plan ON restaurant_profile_users(plan);

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DO $$ BEGIN
    CREATE TRIGGER update_users_index_updated_at BEFORE UPDATE ON users_index FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_restaurant_profile_updated_at BEFORE UPDATE ON restaurant_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_restaurant_profile_users_updated_at BEFORE UPDATE ON restaurant_profile_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 8. SAMPLE DATA FOR DEVELOPER ACCOUNT
-- =====================================================

-- Insert developer restaurant profile (if not exists)
-- Note: This will be created when the developer first registers through your website
-- The schema is now compatible with your existing website registration flow

-- For testing purposes, you can manually insert developer data:
/*
INSERT INTO restaurant_profile (
    name, 
    owner_email, 
    owner_name, 
    owner_user_id,
    status,
    plan,
    payment_captured_at,
    subscription_status
) 
SELECT 
    'SURA Developer Restaurant',
    'sura.resto.biz@gmail.com',
    'SURA Developer',
    (SELECT id FROM auth.users WHERE email = 'sura.resto.biz@gmail.com'),
    'active',
    'enterprise',
    NOW(),
    'active'
WHERE NOT EXISTS (
    SELECT 1 FROM restaurant_profile WHERE owner_email = 'sura.resto.biz@gmail.com'
);
*/

-- Note: The developer user will be automatically added to users_index and restaurant_profile_users
-- when they first log in through the application

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Your Supabase database is now ready for SURA Restaurant Management System!
-- 
-- Next steps:
-- 1. Test login with sura.resto.biz@gmail.com (developer account)
-- 2. Register regular users through your website
-- 3. Test manager creation functionality
-- 
-- The system will gracefully handle missing tables during development
-- and provide full functionality once this schema is applied.