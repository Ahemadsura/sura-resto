import { billsServiceFirebase } from './firebase';
import { billsServiceRest } from './rest';

export const billsService =
  (process.env.NEXT_PUBLIC_DATA_PROVIDER || 'firebase') === 'rest'
    ? billsServiceRest
    : billsServiceFirebase;


