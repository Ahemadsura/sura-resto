import { subscriptionServiceFirebase } from './firebase';
import { subscriptionServiceRest } from './rest';

export const subscriptionService =
  (process.env.NEXT_PUBLIC_DATA_PROVIDER || 'firebase') === 'rest'
    ? subscriptionServiceRest
    : subscriptionServiceFirebase;


