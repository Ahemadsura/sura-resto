import { staffServiceFirebase } from './firebase';
import { staffServiceRest } from './rest';

export const staffService =
  (process.env.NEXT_PUBLIC_DATA_PROVIDER || 'firebase') === 'rest'
    ? staffServiceRest
    : staffServiceFirebase;


