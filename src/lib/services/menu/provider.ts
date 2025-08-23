import { menuServiceFirebase } from './firebase';
import { menuServiceRest } from './rest';

export const menuService =
  (process.env.NEXT_PUBLIC_DATA_PROVIDER || 'firebase') === 'rest'
    ? menuServiceRest
    : menuServiceFirebase;


