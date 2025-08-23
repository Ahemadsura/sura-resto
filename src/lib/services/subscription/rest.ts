import type { SubscriptionService, Subscription } from './index';

export const subscriptionServiceRest: SubscriptionService = {
  async get(): Promise<Subscription> {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/subscription`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch subscription');
    return res.json();
  },
};


