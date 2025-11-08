-- =====================================================
-- SURA RESTAURANT MANAGEMENT - POLICY CLEANUP SCRIPT
-- Use this if you need to reset RLS policies
-- Run this in your Supabase SQL Editor BEFORE running setup-supabase-schema.sql
-- =====================================================

-- Drop all existing policies for restaurant_profile
DROP POLICY IF EXISTS "Users can read own restaurant profile by user id" ON "public"."restaurant_profile";
DROP POLICY IF EXISTS "Users can read own restaurant profile by email" ON "public"."restaurant_profile";
DROP POLICY IF EXISTS "Users can insert own restaurant profile" ON "public"."restaurant_profile";
DROP POLICY IF EXISTS "Users can update own restaurant profile" ON "public"."restaurant_profile";

-- Drop all existing policies for restaurant_profile_users
DROP POLICY IF EXISTS "Users can read own restaurant profile users" ON "public"."restaurant_profile_users";
DROP POLICY IF EXISTS "Users can insert own restaurant profile users" ON "public"."restaurant_profile_users";
DROP POLICY IF EXISTS "Users can update own restaurant profile users" ON "public"."restaurant_profile_users";
DROP POLICY IF EXISTS "Owners can manage restaurant users" ON "public"."restaurant_profile_users";

-- Drop all existing policies for users_index
DROP POLICY IF EXISTS "Users can read own user index" ON "public"."users_index";
DROP POLICY IF EXISTS "Users can insert own user index" ON "public"."users_index";
DROP POLICY IF EXISTS "Users can update own user index" ON "public"."users_index";

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_users_index_updated_at ON users_index;
DROP TRIGGER IF EXISTS update_restaurant_profile_updated_at ON restaurant_profile;
DROP TRIGGER IF EXISTS update_restaurant_profile_users_updated_at ON restaurant_profile_users;

-- Note: This script only removes policies and triggers, not tables or data
-- After running this, you can safely run setup-supabase-schema.sql

SELECT 'Policies and triggers cleaned up successfully!' as status;