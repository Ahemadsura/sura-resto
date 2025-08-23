import type { Bill } from '../../../types';

export interface BillsService {
  list(restaurantId: string): Promise<Bill[]>;
}


