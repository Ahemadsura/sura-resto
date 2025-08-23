import { usersServiceFirebase } from './firebase';
import { usersServiceRest } from './rest';

export const usersService =
  (process.env.NEXT_PUBLIC_DATA_PROVIDER || 'firebase') === 'rest'
    ? usersServiceRest
    : usersServiceFirebase;


