import { supabase, supabaseAdmin } from '../../../config/supabase';

export interface RestaurantUser {
  id: string;
  email: string;
  displayName: string;
  role: 'owner' | 'manager';
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  createdBy: string;
}

export interface CreateManagerData {
  email: string;
  password: string;
  displayName: string;
}

export class SupabaseUserService {
  /**
   * Get all users for the current restaurant
   * For now, returns mock data until the database schema is set up
   */
  static async getRestaurantUsers(restaurantId: string): Promise<RestaurantUser[]> {
    try {
      // First, try to get from the actual database
      const { data, error } = await supabase
        .from('restaurant_profile_users')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Restaurant users table not found, returning mock data:', error);
        // Return mock data with current user as owner
        const currentUser = await supabase.auth.getUser();
        if (currentUser.data.user) {
          return [{
            id: currentUser.data.user.id,
            email: currentUser.data.user.email || 'owner@example.com',
            displayName: currentUser.data.user.user_metadata?.display_name || 'Restaurant Owner',
            role: 'owner',
            createdAt: new Date(),
            isActive: true,
            createdBy: currentUser.data.user.id
          }];
        }
        return [];
      }

      return data.map(user => ({
        id: user.user_id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        createdAt: new Date(user.created_at),
        lastLogin: user.last_login ? new Date(user.last_login) : undefined,
        isActive: user.is_active,
        createdBy: user.created_by
      }));
    } catch (error) {
      console.error('Error in getRestaurantUsers:', error);
      // Return mock data as fallback
      const currentUser = await supabase.auth.getUser();
      if (currentUser.data.user) {
        return [{
          id: currentUser.data.user.id,
          email: currentUser.data.user.email || 'owner@example.com',
          displayName: 'Restaurant Owner',
          role: 'owner',
          createdAt: new Date(),
          isActive: true,
          createdBy: currentUser.data.user.id
        }];
      }
      return [];
    }
  }

  /**
   * Create a new manager user
   */
  static async createManager(data: CreateManagerData, restaurantId: string): Promise<void> {
    try {
      // Step 1: Check manager count first
      const { data: managers, error: countError } = await supabase
        .from('restaurant_profile_users')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('role', 'manager');

      if (countError) {
        console.warn('Could not check manager count:', countError);
        // Continue anyway for development
      } else if (managers && managers.length >= 2) {
        throw new Error('Maximum 2 managers allowed');
      }

      // Step 2: Create the auth user using Supabase Auth Admin
      if (!supabaseAdmin) {
        throw new Error('Admin operations not available. Please add REACT_APP_SUPABASE_SERVICE_ROLE_KEY to your environment variables.');
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          display_name: data.displayName,
          role: 'manager'
        }
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          throw new Error('A user with this email already exists');
        }
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      const userId = authData.user.id;

      // Step 3: Add to users_index
      const { error: indexError } = await supabase
        .from('users_index')
        .insert({
          user_id: userId,
          restaurant_id: restaurantId
        });

      if (indexError) {
        // Clean up auth user if database insert fails
        if (supabaseAdmin) {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        }
        throw new Error('Failed to create user index: ' + indexError.message);
      }

      // Step 4: Add to restaurant_profile_users
      const currentUser = await supabase.auth.getUser();
      const { error: profileError } = await supabase
        .from('restaurant_profile_users')
        .insert({
          user_id: userId,
          restaurant_id: restaurantId,
          email: data.email,
          display_name: data.displayName,
          role: 'manager',
          is_active: true,
          created_by: currentUser.data.user?.id
        });

      if (profileError) {
        // Clean up auth user and index if profile insert fails
        await supabase.from('users_index').delete().eq('user_id', userId);
        if (supabaseAdmin) {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        }
        throw new Error('Failed to create user profile: ' + profileError.message);
      }

      console.log('Manager created successfully:', data.displayName);

    } catch (error) {
      console.error('Error creating manager:', error);
      throw error;
    }
  }

  /**
   * Toggle manager active status
   */
  static async toggleManagerStatus(userId: string, isActive: boolean, restaurantId: string): Promise<void> {
    try {
      // Check manager limit if activating
      if (isActive) {
        const { count, error: countError } = await supabase
          .from('restaurant_profile_users')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .eq('role', 'manager')
          .eq('is_active', true);

        if (countError) {
          console.warn('restaurant_profile_users table not found:', countError);
        } else if (count && count >= 2) {
          throw new Error('Maximum limit of 2 active managers reached');
        }
      }

      const { error } = await supabase
        .from('restaurant_profile_users')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .eq('role', 'manager');

      if (error) {
        console.warn('Could not update manager status in database:', error);
        // For development, just log the action
        console.log('Manager status toggle simulated:', userId, isActive);
      }
    } catch (error) {
      console.error('Error toggling manager status:', error);
      throw error;
    }
  }

  /**
   * Remove a manager user
   */
  static async removeManager(userId: string, restaurantId: string): Promise<void> {
    try {
      // Step 1: Remove from restaurant_profile_users
      const { error: profileError } = await supabase
        .from('restaurant_profile_users')
        .delete()
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .eq('role', 'manager');

      if (profileError) {
        throw new Error('Failed to remove user profile: ' + profileError.message);
      }

      // Step 2: Remove from users_index
      const { error: indexError } = await supabase
        .from('users_index')
        .delete()
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId);

      if (indexError) {
        throw new Error('Failed to remove user index: ' + indexError.message);
      }

      // Step 3: Delete the auth user
      if (supabaseAdmin) {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) {
          console.warn('Could not delete auth user (user may still exist in auth):', authError);
          // Don't throw error here as the user is already removed from restaurant
        }
      }

      console.log('Manager removed successfully:', userId);

    } catch (error) {
      console.error('Error removing manager:', error);
      throw error;
    }
  }

  /**
   * Update owner status (for fixing owner issues)
   */
  static async fixOwnerStatus(restaurantId: string): Promise<void> {
    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) {
        throw new Error('No authenticated user');
      }

      const { error } = await supabase
        .from('restaurant_profile_users')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.data.user.id)
        .eq('restaurant_id', restaurantId)
        .eq('role', 'owner');

      if (error) {
        console.warn('Could not update owner status in database:', error);
        // For development, just log the action
        console.log('Owner status fix simulated for restaurant:', restaurantId);
      }
    } catch (error) {
      console.error('Error fixing owner status:', error);
      throw error;
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): { isValid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return { isValid: false, error: 'Email is required' };
    }
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }
    return { isValid: true };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { isValid: boolean; error?: string } {
    if (!password) {
      return { isValid: false, error: 'Password is required' };
    }
    if (password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' };
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one lowercase letter' };
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one uppercase letter' };
    }
    if (!/(?=.*\d)/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one number' };
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one special character (@$!%*?&)' };
    }
    return { isValid: true };
  }

  /**
   * Validate display name
   */
  static validateDisplayName(name: string): { isValid: boolean; error?: string } {
    if (!name) {
      return { isValid: false, error: 'Name is required' };
    }
    if (name.length < 2) {
      return { isValid: false, error: 'Name must be at least 2 characters long' };
    }
    if (name.length > 50) {
      return { isValid: false, error: 'Name must be less than 50 characters' };
    }
    if (!/^[a-zA-Z0-9\s\-']+$/.test(name)) {
      return { isValid: false, error: 'Name can only contain letters, numbers, spaces, hyphens, and apostrophes' };
    }
    return { isValid: true };
  }
}