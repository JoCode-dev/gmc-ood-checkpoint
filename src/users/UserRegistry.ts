import { LibraryError } from "../errors/LibraryError.js";
import type { User } from "./User.js";

/** User-management subsystem: stores members and rejects duplicates. */
export class UserRegistry {
  readonly #users = new Map<string, User>();

  add(user: User): void {
    if (this.#users.has(user.id)) {
      throw new LibraryError(`User id "${user.id}" already exists.`);
    }

    for (const existing of this.#users.values()) {
      if (existing.email === user.email) {
        throw new LibraryError(`Email "${user.email}" is already registered.`);
      }
    }

    this.#users.set(user.id, user);
  }

  require(id: string): User {
    const user = this.#users.get(id);
    if (!user) {
      throw new LibraryError(`Unknown user: "${id}".`);
    }
    return user;
  }

  list(): User[] {
    return [...this.#users.values()];
  }
}
