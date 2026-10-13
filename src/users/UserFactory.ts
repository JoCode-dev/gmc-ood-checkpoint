import { LibraryError } from "../errors/LibraryError.js";
import { Student } from "./Student.js";
import { Teacher } from "./Teacher.js";
import type { CreateUserData, User, UserRole } from "./User.js";

/**
 * Factory: callers ask for a role and receive the right User subclass
 * without constructing Student or Teacher themselves.
 */
export class UserFactory {
  create(role: UserRole, data: CreateUserData): User {
    const id = data.id?.trim() || crypto.randomUUID();

    switch (role) {
      case "student":
        return new Student(id, data.name, data.email);
      case "teacher":
        return new Teacher(id, data.name, data.email);
      default: {
        const unknownRole: never = role;
        throw new LibraryError(`Unsupported user role: ${String(unknownRole)}`);
      }
    }
  }
}
