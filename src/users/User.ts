import { LibraryError } from "../errors/LibraryError.js";
import type { Observer } from "../notifications/Observer.js";

export type UserRole = "student" | "teacher";

export interface CreateUserData {
  name: string;
  email: string;
  id?: string;
}

/**
 * Shared user behavior. Concrete roles (Student, Teacher) supply the loan policy.
 * A user is also an Observer and stores the notices it receives.
 */
export abstract class User implements Observer {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly #notices: string[] = [];

  constructor(id: string, name: string, email: string) {
    const normalizedId = id.trim();
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedId) {
      throw new LibraryError("User id is required.");
    }
    if (!normalizedName) {
      throw new LibraryError("User name is required.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new LibraryError(`Invalid email: "${email}".`);
    }

    this.id = normalizedId;
    this.name = normalizedName;
    this.email = normalizedEmail;
  }

  abstract get role(): UserRole;

  /** Maximum number of books this user may hold at once. */
  abstract get borrowLimit(): number;

  /** Number of days a loan stays open before it becomes overdue. */
  abstract get loanDays(): number;

  update(message: string): void {
    this.#notices.push(message);
  }

  get notifications(): readonly string[] {
    return [...this.#notices];
  }
}
