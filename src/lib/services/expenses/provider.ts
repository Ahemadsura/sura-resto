import { expensesServiceFirebase } from './firebase';
import { expensesServiceRest } from './rest';

export const expensesService =
  (process.env.NEXT_PUBLIC_DATA_PROVIDER || 'firebase') === 'rest'
    ? expensesServiceRest
    : expensesServiceFirebase;


