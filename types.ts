
export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Member {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  description: string;
  memberId?: string; // Optional: linked to a member for income
  category: string;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'MEMBER' | 'TRANSACTION';
  details: string;
}

export interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
}
