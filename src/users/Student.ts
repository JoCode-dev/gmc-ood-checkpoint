import { User, type UserRole } from "./User.js";

/** Student loan policy: 3 books, 14 days. */
export class Student extends User {
  override get role(): UserRole {
    return "student";
  }

  override get borrowLimit(): number {
    return 3;
  }

  override get loanDays(): number {
    return 14;
  }
}
