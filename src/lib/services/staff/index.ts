export interface StaffMember {
  id?: string;
  name: string;
  salary: number;
  paid: boolean;
  joinDate: string;
  lastPaidDate?: string;
  pendingMonths: number;
  prepaid: { month: number; year: number; amount: number }[];
  leave: number;
  leaveHistory?: { month: number; year: number; days: number }[];
  paymentHistory: { month: number; year: number; amount: number; paidDate: string; type: 'salary' | 'upad' }[];
}

export interface StaffService {
  list(restaurantId: string): Promise<StaffMember[]>;
  create(restaurantId: string, data: Omit<StaffMember, 'id'>): Promise<string>; // returns new id
  update(restaurantId: string, id: string, data: Partial<StaffMember>): Promise<void>;
  remove(restaurantId: string, id: string): Promise<void>;
}


