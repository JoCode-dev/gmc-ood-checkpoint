import { LibraryError } from "../errors/LibraryError.js";
import { addDays } from "../utils/date.js";

interface OpenLoanInput {
  userId: string;
  isbn: string;
  borrowedAt: Date;
  loanDays: number;
}

/**
 * One borrow/return cycle for a single copy.
 * `overdue` is a flag: it can be set from the due date or simulated directly.
 */
export class BorrowTransaction {
  readonly id: string;
  readonly userId: string;
  readonly isbn: string;
  readonly borrowedAt: Date;
  readonly dueDate: Date;
  #returnedAt: Date | null = null;
  #overdue = false;
  #notified = false;

  private constructor(id: string, userId: string, isbn: string, borrowedAt: Date, dueDate: Date) {
    this.id = id;
    this.userId = userId;
    this.isbn = isbn;
    this.borrowedAt = borrowedAt;
    this.dueDate = dueDate;
  }

  static open(input: OpenLoanInput): BorrowTransaction {
    return new BorrowTransaction(
      crypto.randomUUID(),
      input.userId,
      input.isbn,
      input.borrowedAt,
      addDays(input.borrowedAt, input.loanDays),
    );
  }

  get returnedAt(): Date | null {
    return this.#returnedAt;
  }

  get isReturned(): boolean {
    return this.#returnedAt !== null;
  }

  get isActive(): boolean {
    return !this.isReturned;
  }

  get isOverdue(): boolean {
    return this.#overdue;
  }

  get needsNotification(): boolean {
    return this.#overdue && this.isActive && !this.#notified;
  }

  markReturned(returnedAt: Date): void {
    if (this.isReturned) {
      throw new LibraryError("This loan is already closed.");
    }
    this.#returnedAt = returnedAt;
  }

  /** Raises the overdue flag. Idempotent until the loan is closed. */
  markOverdue(): void {
    if (this.isReturned) {
      throw new LibraryError("A returned loan cannot be marked overdue.");
    }
    this.#overdue = true;
  }

  confirmNotified(): void {
    if (!this.needsNotification) {
      throw new LibraryError("There is no pending overdue notice for this loan.");
    }
    this.#notified = true;
  }
}
