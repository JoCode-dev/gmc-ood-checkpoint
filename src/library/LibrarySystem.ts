import { Book } from "../books/Book.js";
import { BookCatalog } from "../books/BookCatalog.js";
import { BorrowingDesk } from "../borrowing/BorrowingDesk.js";
import type { BorrowTransaction } from "../borrowing/BorrowTransaction.js";
import { LibraryError } from "../errors/LibraryError.js";
import { NotificationService } from "../notifications/NotificationService.js";
import { UserFactory } from "../users/UserFactory.js";
import { UserRegistry } from "../users/UserRegistry.js";
import type { CreateUserData, User, UserRole } from "../users/User.js";
import type { BookProfile, BorrowedBookView, UserProfile } from "./views.js";

interface NewBookInput {
  isbn: string;
  title: string;
  author: string;
  copies?: number;
}

/**
 * Singleton facade. One library coordinates the three subsystems
 * (users, catalog, borrowing) and the notification subject.
 */
export class LibrarySystem {
  static #instance: LibrarySystem | null = null;

  readonly #users = new UserRegistry();
  readonly #catalog = new BookCatalog();
  readonly #desk = new BorrowingDesk();
  readonly #notifications = new NotificationService();
  readonly #userFactory = new UserFactory();

  private constructor() {}

  static getInstance(): LibrarySystem {
    LibrarySystem.#instance ??= new LibrarySystem();
    return LibrarySystem.#instance;
  }

  addUser(role: UserRole, data: CreateUserData): UserProfile {
    const user = this.#userFactory.create(role, data);
    this.#users.add(user);
    this.#notifications.subscribe(user.id, user);
    return this.#toUserProfile(user);
  }

  unsubscribe(userId: string): void {
    const user = this.#users.require(userId);
    this.#notifications.unsubscribe(user.id);
  }

  addBook(input: NewBookInput): BookProfile {
    const book = new Book(input.isbn, input.title, input.author, input.copies ?? 1);
    this.#catalog.add(book);
    return this.#toBookProfile(book);
  }

  borrowBook(userId: string, isbn: string, borrowedAt: Date = new Date()): BorrowedBookView {
    const user = this.#users.require(userId);
    const book = this.#catalog.require(isbn);
    const transaction = this.#desk.borrow(user, book, borrowedAt);
    return this.#toBorrowedView(transaction);
  }

  returnBook(userId: string, isbn: string, returnedAt: Date = new Date()): BorrowedBookView {
    const user = this.#users.require(userId);
    const book = this.#catalog.require(isbn);
    const transaction = this.#desk.giveBack(user, book, returnedAt);
    return this.#toBorrowedView(transaction);
  }

  /** Active loans, optionally filtered to one user. */
  getBorrowedBooks(userId?: string): BorrowedBookView[] {
    if (userId !== undefined) {
      this.#users.require(userId);
    }
    return this.#desk.activeLoans(userId).map((transaction) => this.#toBorrowedView(transaction));
  }

  /**
   * Marks loans whose due date has passed and notifies subscribed users.
   * Returns the messages that were actually delivered.
   */
  notifyOverdueUsers(asOf: Date = new Date()): string[] {
    return this.#deliverNotices(this.#desk.collectDueNotices(asOf));
  }

  /**
   * Simulates an overdue loan with an explicit flag, then notifies the borrower.
   * Returns the delivered message.
   */
  flagAsOverdue(transactionId: string): string {
    const transaction = this.#desk.flag(transactionId);
    const [message] = this.#deliverNotices([transaction]);
    if (!message) {
      throw new LibraryError("This loan was already reported, or the user is not subscribed.");
    }
    return message;
  }

  getNotifications(userId: string): readonly string[] {
    return this.#users.require(userId).notifications;
  }

  listUsers(): UserProfile[] {
    return this.#users.list().map((user) => this.#toUserProfile(user));
  }

  listBooks(): BookProfile[] {
    return this.#catalog.list().map((book) => this.#toBookProfile(book));
  }

  #deliverNotices(transactions: BorrowTransaction[]): string[] {
    const delivered: string[] = [];

    for (const transaction of transactions) {
      if (!transaction.needsNotification) {
        continue;
      }

      const user = this.#users.require(transaction.userId);
      const book = this.#catalog.require(transaction.isbn);
      const due = transaction.dueDate.toISOString().slice(0, 10);
      const message = `"${book.title}" is overdue (due ${due}).`;

      if (!this.#notifications.notify(user.id, message)) {
        continue;
      }

      transaction.confirmNotified();
      delivered.push(`${user.name}: ${message}`);
    }

    return delivered;
  }

  #toUserProfile(user: User): UserProfile {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      borrowLimit: user.borrowLimit,
      loanDays: user.loanDays,
    };
  }

  #toBookProfile(book: Book): BookProfile {
    return {
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
    };
  }

  #toBorrowedView(transaction: BorrowTransaction): BorrowedBookView {
    const user = this.#users.require(transaction.userId);
    const book = this.#catalog.require(transaction.isbn);

    return {
      transactionId: transaction.id,
      userId: user.id,
      userName: user.name,
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      borrowedAt: transaction.borrowedAt.toISOString(),
      dueDate: transaction.dueDate.toISOString(),
      overdue: transaction.isOverdue,
    };
  }
}
