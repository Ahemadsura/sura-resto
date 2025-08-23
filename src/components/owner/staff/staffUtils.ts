type StaffType = {
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
};

export const getStaffTotals = (
  staff: StaffType,
  { month, year }: { month?: number; year?: number } = {}
) => {
  const salaryPayments = staff.paymentHistory.filter((h) => h.type === 'salary');
  const upadPayments = staff.paymentHistory.filter((h) => h.type === 'upad');
  const leaveHistory = Array.isArray(staff.leaveHistory) ? staff.leaveHistory : [];

  let salaryTotal = 0, upadTotal = 0, leaveTotal = 0, daysWorked = 0;
  let totalDays = 0;

  if (month !== undefined && year !== undefined) {
    salaryTotal = salaryPayments.filter((h) => h.month === month && h.year === year)
      .reduce((a, h) => a + h.amount, 0);
    upadTotal = upadPayments.filter((h) => h.month === month && h.year === year)
      .reduce((a, h) => a + h.amount, 0);
    leaveTotal = leaveHistory.filter((l) => l.month === month && l.year === year)
      .reduce((a, l) => a + l.days, 0);
    totalDays = new Date(year, month + 1, 0).getDate();
  } else if (year !== undefined) {
    salaryTotal = salaryPayments.filter((h) => h.year === year)
      .reduce((a, h) => a + h.amount, 0);
    upadTotal = upadPayments.filter((h) => h.year === year)
      .reduce((a, h) => a + h.amount, 0);
    leaveTotal = leaveHistory.filter((l) => l.year === year)
      .reduce((a, l) => a + l.days, 0);
    totalDays = Array.from(new Set(leaveHistory.filter((l) => l.year === year).map((l) => l.month)))
      .reduce((sum, m) => sum + new Date(year, m + 1, 0).getDate(), 0);
  } else {
    salaryTotal = salaryPayments.reduce((a, h) => a + h.amount, 0);
    upadTotal = upadPayments.reduce((a, h) => a + h.amount, 0);
    leaveTotal = leaveHistory.reduce((a, l) => a + l.days, 0);
    const uniquePeriods = Array.from(new Set(leaveHistory.map((l) => `${l.year}-${l.month}`)));
    totalDays = uniquePeriods.reduce((sum, key) => {
      const [y, m] = key.split("-").map(Number);
      return sum + new Date(y, m + 1, 0).getDate();
    }, 0);
  }

  daysWorked = Math.max(0, totalDays - leaveTotal);
  return { salaryTotal, upadTotal, leaveTotal, daysWorked };
};

export const getAmountLeftToPay = (staff: StaffType) => {
  const now = new Date();
  const nowMonth = now.getMonth();
  const nowYear = now.getFullYear();

  if (staff.paid && staff.lastPaidDate) {
    const paidDate = new Date(staff.lastPaidDate);
    if (paidDate.getFullYear() === nowYear && paidDate.getMonth() === nowMonth) {
      return 0;
    }
  }

  const dailyRate = staff.salary / 30;
  const leaveDeduction = (staff.leave || 0) * dailyRate;
  const upadForMonth =
    (staff.prepaid || []).find((p) => p.month === nowMonth && p.year === nowYear)?.amount || 0;

  return Math.max(0, Math.floor(staff.salary - upadForMonth - leaveDeduction));
};

export const getMonthsSinceJoining = (joinDate: string) => {
  const join = new Date(joinDate);
  const now = new Date();
  return (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth()) + 1;
}; 