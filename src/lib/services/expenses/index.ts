export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  createdBy: string;
  createdAt: Date | string;
}

export interface ExpensesService {
  list(restaurantId: string): Promise<Expense[]>;
  create(restaurantId: string, data: Omit<Expense, 'id' | 'createdAt'>): Promise<void>;
}


