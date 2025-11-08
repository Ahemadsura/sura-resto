-- =====================================================
-- SURA RESTAURANT MANAGEMENT - ADD MISSING COLUMNS
-- Run this FIRST if you get "column does not exist" errors
-- =====================================================

-- Add is_active column to restaurant_profile_users if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurant_profile_users' 
                   AND column_name = 'is_active') THEN
        ALTER TABLE public.restaurant_profile_users ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to restaurant_profile_users';
    ELSE
        RAISE NOTICE 'Column is_active already exists in restaurant_profile_users';
    END IF;
END $$;

-- Add created_by column to restaurant_profile_users if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurant_profile_users' 
                   AND column_name = 'created_by') THEN
        ALTER TABLE public.restaurant_profile_users ADD COLUMN created_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added created_by column to restaurant_profile_users';
    ELSE
        RAISE NOTICE 'Column created_by already exists in restaurant_profile_users';
    END IF;
END $$;

-- Add updated_at column to restaurant_profile_users if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurant_profile_users' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.restaurant_profile_users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to restaurant_profile_users';
    ELSE
        RAISE NOTICE 'Column updated_at already exists in restaurant_profile_users';
    END IF;
END $$;

-- Add last_login column to restaurant_profile_users if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'restaurant_profile_users' 
                   AND column_name = 'last_login') THEN
        ALTER TABLE public.restaurant_profile_users ADD COLUMN last_login TIMESTAMPTZ;
        RAISE NOTICE 'Added last_login column to restaurant_profile_users';
    ELSE
        RAISE NOTICE 'Column last_login already exists in restaurant_profile_users';
    END IF;
END $$;

-- Add is_active column to users_index if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users_index' 
                   AND column_name = 'is_active') THEN
        ALTER TABLE public.users_index ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to users_index';
    ELSE
        RAISE NOTICE 'Column is_active already exists in users_index';
    END IF;
END $$;

-- Add updated_at column to users_index if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users_index' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.users_index ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to users_index';
    ELSE
        RAISE NOTICE 'Column updated_at already exists in users_index';
    END IF;
END $$;

-- Update existing records to have is_active = true if they are NULL
UPDATE public.restaurant_profile_users SET is_active = true WHERE is_active IS NULL;
UPDATE public.users_index SET is_active = true WHERE is_active IS NULL;

SELECT 'Missing columns added successfully!' as status;