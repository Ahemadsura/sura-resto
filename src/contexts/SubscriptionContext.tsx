import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Subscription } from '../lib/services/subscription';
import { useAuth } from './SupabaseAuthContext';
import { supabase } from '../config/supabase';

type EffectiveStatus = 'active' | 'expiring' | 'expired';

type SubscriptionContextType = {
  subscription: Subscription | null;
  status: EffectiveStatus;
  daysRemaining: number;
  loading: boolean;
  refresh: () => Promise<void>;
  isDeveloperBypass: boolean;
  isDeveloperAccount: boolean;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
};

// Developer accounts that bypass all subscription restrictions
const DEVELOPER_ACCOUNTS = [
  'sura.resto.biz@gmail.com'
];

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Check if current user is a developer account
  const isDeveloperAccount = useMemo(() => {
    return DEVELOPER_ACCOUNTS.includes((currentUser?.email || '').toLowerCase());
  }, [currentUser?.email]);
  
  // For backward compatibility, isDeveloperBypass is same as isDeveloperAccount
  const isDeveloperBypass = isDeveloperAccount;

  const computeDaysRemaining = useCallback((endIso: string | undefined): number => {
    if (!endIso) return 0;
    const end = new Date(endIso).getTime();
    return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  }, []);

  const refresh = useCallback(async () => {
    if (!currentUser?.restaurantId) return;
    setLoading(true);
    
    try {
      // Developer accounts get unlimited access
      if (isDeveloperAccount) {
        setSubscription({
          planName: 'Developer',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(), // 1 year from now
          status: 'active'
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('restaurant_profile')
        .select('*')
        .eq('id', currentUser.restaurantId)
        .single();
      
      if (error) {
        console.error('Error fetching restaurant profile:', error);
        setSubscription(null);
        return;
      }
      
      if (data) {
        // Check if payment was captured and status is active
        const hasValidPayment = data.payment_captured_at && data.status === 'active';
        
        if (hasValidPayment) {
          // Calculate subscription end date based on payment (30 days from payment)
          const paymentDate = new Date(data.payment_captured_at);
          const endDate = new Date(paymentDate.getTime() + (30 * 24 * 60 * 60 * 1000));
          const now = new Date();
          
          setSubscription({
            planName: data.plan ? data.plan.charAt(0).toUpperCase() + data.plan.slice(1) : 'Starter',
            startDate: paymentDate.toISOString(),
            endDate: endDate.toISOString(),
            status: now <= endDate ? 'active' : 'expired'
          });
        } else {
          // No valid payment or status not active
          setSubscription({
            planName: data.plan ? data.plan.charAt(0).toUpperCase() + data.plan.slice(1) : 'Trial',
            startDate: new Date(data.created_at).toISOString(),
            endDate: new Date(data.created_at).toISOString(), // Expired immediately if no payment
            status: 'expired'
          });
        }
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Subscription refresh error:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.restaurantId, isDeveloperAccount]);

  useEffect(() => {
    if (!currentUser?.restaurantId) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    
    // Initial load
    refresh();
    
    // Set up real-time subscription for restaurant profile changes
    const channel = supabase
      .channel('restaurant-subscription-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'restaurant_profile',
        filter: `id=eq.${currentUser.restaurantId}`
      }, (payload) => {
        console.log('Restaurant profile updated:', payload);
        refresh(); // Refresh subscription data when restaurant profile changes
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.restaurantId, refresh]);

  const daysRemaining = useMemo(() => computeDaysRemaining(subscription?.endDate), [subscription, computeDaysRemaining]);

  const status: EffectiveStatus = useMemo(() => {
    // Developer accounts always have active status
    if (isDeveloperAccount) return 'active';
    
    // For all other users, enforce strict subscription checks
    if (!subscription) return 'expired';
    if (subscription.status === 'expired') return 'expired';
    if (daysRemaining <= 0) return 'expired';
    if (daysRemaining < 7) return 'expiring'; // Warning when less than 7 days remaining
    return 'active';
  }, [subscription, daysRemaining, isDeveloperAccount]);

  const value: SubscriptionContextType = {
    subscription,
    status,
    daysRemaining,
    loading,
    refresh,
    isDeveloperBypass,
    isDeveloperAccount,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};


