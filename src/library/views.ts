import type { UserRole } from "../users/User.js";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  borrowLimit: number;
  loanDays: number;
}

export interface BookProfile {
  isbn: string;
  title: string;
  author: string;
  totalCopies: number;
  availableCopies: number;
}

export interface BorrowedBookView {
  transactionId: string;
  userId: string;
  userName: string;
  isbn: string;
  title: string;
  author: string;
  borrowedAt: string;
  dueDate: string;
  overdue: boolean;
}
