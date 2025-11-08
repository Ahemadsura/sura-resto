import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { User } from '../types';

interface AuthContextType {
    currentUser: User | null;
    session: Session | null;
    login: (email: string, password: string, role: 'owner' | 'manager') => Promise<void>;
    logout: () => Promise<void>;
    loading: boolean;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const login = async (email: string, password: string, role: 'owner' | 'manager') => {
        try {
            // Step 1: Authenticate with Supabase Auth (equivalent to Firebase Auth)
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) {
                throw authError;
            }

            if (!authData.user) {
                throw new Error('Authentication failed - no user returned');
            }

            const uid = authData.user.id;

            // Step 2: Get restaurantId from users_index (equivalent to Firebase users/{uid})
            const { data: userIndexData, error: userIndexError } = await supabase
                .from('users_index')
                .select('restaurant_id')
                .eq('user_id', uid)
                .single();

            if (userIndexError || !userIndexData) {
                console.error('User index lookup failed:', userIndexError);
                throw new Error(`User data not found (root). Your account exists but is not properly configured. Please contact support or run the account setup script. User ID: ${uid}, Email: ${authData.user.email}`);
            }

            const restaurantId = userIndexData.restaurant_id;

            // Step 3: Get user profile from restaurant_profile_users (equivalent to Firebase restaurantProfile/{restaurantId}/users/{uid})
            const { data: profileData, error: profileError } = await supabase
                .from('restaurant_profile_users')
                .select('*')
                .eq('user_id', uid)
                .eq('restaurant_id', restaurantId)
                .single();

            if (profileError || !profileData) {
                console.error('User profile lookup failed:', profileError);
                throw new Error(`User data not found (profile). Your account exists but is not properly configured. Please contact support or run the account setup script. User ID: ${uid}, Restaurant ID: ${restaurantId}, Email: ${authData.user.email}`);
            }

            // Auto-detect role from database (like Firebase - no strict validation)
            const actualRole = profileData.role;
            console.log('User role in database:', actualRole);
            console.log('Selected role during login:', role);

            // Create User object (equivalent to Firebase currentUser)
            setCurrentUser({
                uid: uid,
                email: authData.user.email!,
                role: actualRole, // Use actual role from database
                restaurantId: restaurantId,
                displayName: profileData.display_name,
                isActive: true // You can add logic here if needed
            });

            setSession(authData.session);

        } catch (error) {
            console.error('Login error:', error);

            // Handle specific Supabase auth errors
            if (error instanceof Error) {
                const authError = error as AuthError;

                switch (authError.message) {
                    case 'Invalid login credentials':
                        throw new Error('Invalid email or password. Please check your credentials.');
                    case 'Email not confirmed':
                        throw new Error('Please check your email and click the confirmation link before signing in.');
                    case 'Too many requests':
                        throw new Error('Too many login attempts. Please wait a few minutes before trying again.');
                    default:
                        throw error;
                }
            }

            throw error;
        }
    };

    const logout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Logout error:', error);
                throw error;
            }

            setCurrentUser(null);
            setSession(null);
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    };

    const resetPassword = async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });

            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    };

    // Load user profile data (equivalent to Firebase onAuthStateChanged)
    const loadUserProfile = async (supabaseUser: SupabaseUser) => {
        try {
            const uid = supabaseUser.id;

            // Step 1: Get restaurantId from users_index (equivalent to Firebase users/{uid})
            const { data: userIndexData, error: userIndexError } = await supabase
                .from('users_index')
                .select('restaurant_id')
                .eq('user_id', uid)
                .single();

            if (userIndexError || !userIndexData) {
                setCurrentUser(null);
                setLoading(false);
                return;
            }

            const restaurantId = userIndexData.restaurant_id;

            // Step 2: Get user profile from restaurant_profile_users (equivalent to Firebase restaurantProfile/{restaurantId}/users/{uid})
            const { data: profileData, error: profileError } = await supabase
                .from('restaurant_profile_users')
                .select('*')
                .eq('user_id', uid)
                .eq('restaurant_id', restaurantId)
                .single();

            if (profileError || !profileData) {
                setCurrentUser(null);
                return;
            }

            // Set current user (equivalent to Firebase onAuthStateChanged)
            setCurrentUser({
                uid: uid,
                email: supabaseUser.email!,
                role: profileData.role,
                restaurantId: restaurantId,
                displayName: profileData.display_name,
                isActive: true
            });

        } catch (error) {
            console.error('Error loading user profile:', error);
            setCurrentUser(null);
        }
    };

    useEffect(() => {
        // Get initial session (equivalent to Firebase onAuthStateChanged)
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                loadUserProfile(session.user);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes (equivalent to Firebase onAuthStateChanged)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state changed:', event, session?.user?.email);

                setSession(session);

                if (session?.user) {
                    await loadUserProfile(session.user);
                } else {
                    setCurrentUser(null);
                }

                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const value = {
        currentUser,
        session,
        login,
        logout,
        resetPassword,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};