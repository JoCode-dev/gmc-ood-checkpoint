import { User, type UserRole } from "./User.js";

/** Teacher loan policy: 10 books, 30 days. */
export class Teacher extends User {
  override get role(): UserRole {
    return "teacher";
  }

  override get borrowLimit(): number {
    return 10;
  }

  override get loanDays(): number {
    return 30;
  }
}
