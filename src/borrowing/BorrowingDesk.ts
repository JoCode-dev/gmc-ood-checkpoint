import type { Book } from "../books/Book.js";
import { LibraryError } from "../errors/LibraryError.js";
import type { User } from "../users/User.js";
import { BorrowTransaction } from "./BorrowTransaction.js";

/** Borrowing subsystem: loan limits, returns, and the overdue flag. */
export class BorrowingDesk {
  readonly #transactions: BorrowTransaction[] = [];

  borrow(user: User, book: Book, borrowedAt: Date): BorrowTransaction {
    this.#assertValidDate(borrowedAt, "borrow");

    const active = this.#activeFor(user.id);
    if (active.length >= user.borrowLimit) {
      throw new LibraryError(
        `${user.name} has reached the limit of ${user.borrowLimit} borrowed book(s).`,
      );
    }
    if (active.some((item) => item.isbn === book.isbn)) {
      throw new LibraryError(`${user.name} already has "${book.title}" on loan.`);
    }
    if (!book.isAvailable) {
      throw new LibraryError(`"${book.title}" is not available.`);
    }

    const transaction = BorrowTransaction.open({
      userId: user.id,
      isbn: book.isbn,
      borrowedAt,
      loanDays: user.loanDays,
    });

    book.checkout();
    this.#transactions.push(transaction);
    return transaction;
  }

  giveBack(user: User, book: Book, returnedAt: Date): BorrowTransaction {
    this.#assertValidDate(returnedAt, "return");

    const transaction = this.#transactions.find(
      (item) => item.isActive && item.userId === user.id && item.isbn === book.isbn,
    );
    if (!transaction) {
      throw new LibraryError(`${user.name} has no active loan for "${book.title}".`);
    }
    if (returnedAt.getTime() < transaction.borrowedAt.getTime()) {
      throw new LibraryError("Return date cannot be earlier than the borrow date.");
    }

    transaction.markReturned(returnedAt);
    book.checkin();
    return transaction;
  }

  activeLoans(userId?: string): BorrowTransaction[] {
    return this.#transactions.filter(
      (item) => item.isActive && (userId === undefined || item.userId === userId),
    );
  }

  /**
   * Sets the overdue flag from the due date and returns loans that still
   * need a notification.
   */
  collectDueNotices(asOf: Date): BorrowTransaction[] {
    this.#assertValidDate(asOf, "reference");

    const pending: BorrowTransaction[] = [];
    for (const transaction of this.#transactions) {
      if (!transaction.isActive) {
        continue;
      }
      if (asOf.getTime() > transaction.dueDate.getTime()) {
        transaction.markOverdue();
      }
      if (transaction.needsNotification) {
        pending.push(transaction);
      }
    }
    return pending;
  }

  flag(transactionId: string): BorrowTransaction {
    const transaction = this.#require(transactionId);
    transaction.markOverdue();
    return transaction;
  }

  require(transactionId: string): BorrowTransaction {
    return this.#require(transactionId);
  }

  #activeFor(userId: string): BorrowTransaction[] {
    return this.#transactions.filter((item) => item.isActive && item.userId === userId);
  }

  #require(transactionId: string): BorrowTransaction {
    const transaction = this.#transactions.find((item) => item.id === transactionId);
    if (!transaction) {
      throw new LibraryError(`Unknown transaction: "${transactionId}".`);
    }
    return transaction;
  }

  #assertValidDate(value: Date, label: string): void {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new LibraryError(`Invalid ${label} date.`);
    }
  }
}
