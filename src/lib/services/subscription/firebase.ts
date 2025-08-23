import type { SubscriptionService, Subscription } from './index';
import { fetchSubscription } from '../../../services/mockSubscriptionService';

// TODO: Replace mock with real Firestore read using your exact paths when ready
export const subscriptionServiceFirebase: SubscriptionService = {
  async get(): Promise<Subscription> {
    const data = await fetchSubscription();
    return {
      planName: data.planName,
      startDate: data.startDate,
      endDate: data.endDate,
      status: (data.status as any) || 'active',
    };
  },
};


