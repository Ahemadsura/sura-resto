export type SubscriptionStatus = 'active' | 'expired' | 'expiring';

export interface Subscription {
  planName: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  status: SubscriptionStatus;
}

export interface SubscriptionService {
  get(): Promise<Subscription>;
  onChange?: (cb: (s: Subscription) => void) => () => void;
}


