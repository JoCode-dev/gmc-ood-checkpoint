import { LibraryError } from "./errors/LibraryError.js";
import { LibrarySystem } from "./library/LibrarySystem.js";
import type { BorrowedBookView } from "./library/views.js";

const TODAY = new Date("2026-10-13T09:00:00.000Z");
const SIX_WEEKS_AGO = new Date("2026-09-01T09:00:00.000Z");

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

function printLoan(loan: BorrowedBookView): void {
  const status = loan.overdue ? "EN RETARD" : "en cours";
  console.log(
    `- ${loan.userName} → « ${loan.title} » | emprunt ${loan.borrowedAt.slice(0, 10)} | retour ${loan.dueDate.slice(0, 10)} | ${status}`,
  );
}

function expectError(action: () => void): string {
  try {
    action();
  } catch (error) {
    if (error instanceof LibraryError) {
      return error.message;
    }
    throw error;
  }
  throw new Error("Expected a LibraryError.");
}

function main(): void {
  const library = LibrarySystem.getInstance();
  const again = LibrarySystem.getInstance();

  section("Singleton");
  assert(library === again, "getInstance() must return the same library.");
  console.log("Une seule instance de LibrarySystem est partagée.");

  section("Utilisateurs (Factory)");
  const aminata = library.addUser("student", {
    id: "student-aminata",
    name: "Aminata Diallo",
    email: "aminata.diallo@example.com",
  });
  const mamadou = library.addUser("teacher", {
    id: "teacher-mamadou",
    name: "Mamadou Ndiaye",
    email: "mamadou.ndiaye@example.com",
  });

  assert(aminata.role === "student" && aminata.borrowLimit === 3 && aminata.loanDays === 14, "Student policy mismatch.");
  assert(mamadou.role === "teacher" && mamadou.borrowLimit === 10 && mamadou.loanDays === 30, "Teacher policy mismatch.");
  console.log(`${aminata.name} — ${aminata.role}, plafond ${aminata.borrowLimit}, durée ${aminata.loanDays} jours`);
  console.log(`${mamadou.name} — ${mamadou.role}, plafond ${mamadou.borrowLimit}, durée ${mamadou.loanDays} jours`);

  const duplicateEmail = expectError(() => {
    library.addUser("student", {
      name: "Autre Aminata",
      email: "Aminata.Diallo@example.com",
    });
  });
  console.log(`Refus doublon : ${duplicateEmail}`);

  section("Catalogue");
  const books = [
    library.addBook({ isbn: "978-0132350884", title: "Clean Code", author: "Robert C. Martin" }),
    library.addBook({
      isbn: "978-0201633610",
      title: "Design Patterns",
      author: "Erich Gamma et al.",
      copies: 2,
    }),
    library.addBook({ isbn: "978-0134757599", title: "Refactoring", author: "Martin Fowler" }),
    library.addBook({
      isbn: "978-0321125217",
      title: "Domain-Driven Design",
      author: "Eric Evans",
    }),
    library.addBook({
      isbn: "978-0135957059",
      title: "The Pragmatic Programmer",
      author: "David Thomas, Andrew Hunt",
    }),
  ];
  for (const book of books) {
    console.log(`- ${book.title} (${book.availableCopies}/${book.totalCopies} dispo)`);
  }

  section("Emprunts");
  const cleanCode = library.borrowBook(aminata.id, "978-0132350884", TODAY);
  const patterns = library.borrowBook(aminata.id, "978-0201633610", TODAY);
  const refactoring = library.borrowBook(aminata.id, "978-0134757599", TODAY);
  const ddd = library.borrowBook(mamadou.id, "978-0321125217", SIX_WEEKS_AGO);
  const patternsTeacher = library.borrowBook(mamadou.id, "978-0201633610", TODAY);

  assert(cleanCode.dueDate.startsWith("2026-10-27"), "A student loan lasts 14 days.");
  assert(ddd.dueDate.startsWith("2026-10-01"), "A teacher loan lasts 30 days.");
  assert(library.listBooks().find((book) => book.isbn === "978-0201633610")?.availableCopies === 0, "Both pattern copies are out.");

  console.log("Prêts en cours :");
  for (const loan of library.getBorrowedBooks()) {
    printLoan(loan);
  }

  const limitMessage = expectError(() => {
    library.borrowBook(aminata.id, "978-0135957059", TODAY);
  });
  assert(limitMessage.includes("limit"), "The fourth loan must be rejected by the student cap.");
  console.log(`Plafond étudiant : ${limitMessage}`);

  const unavailableMessage = expectError(() => {
    library.borrowBook(mamadou.id, "978-0132350884", TODAY);
  });
  assert(unavailableMessage.includes("not available"), "A book with no copies must be refused.");
  console.log(`Indisponible : ${unavailableMessage}`);

  section("Retour");
  library.returnBook(aminata.id, "978-0132350884", TODAY);
  const cleanCodeAfterReturn = library.listBooks().find((book) => book.isbn === "978-0132350884");
  assert(cleanCodeAfterReturn?.availableCopies === 1, "Returned copy is back on the shelf.");
  assert(
    library.getBorrowedBooks(aminata.id).every((loan) => loan.isbn !== "978-0132350884"),
    "Returned book leaves the active list.",
  );
  console.log("Clean Code est de retour en rayon. Prêts d'Aminata :");
  for (const loan of library.getBorrowedBooks(aminata.id)) {
    printLoan(loan);
  }

  section("Retard par date (Observer)");
  const datedNotices = library.notifyOverdueUsers(TODAY);
  assert(datedNotices.length === 1, "Only the September teacher loan is past its due date.");
  assert(datedNotices[0]?.includes("Domain-Driven Design") === true, "The overdue title is DDD.");
  console.log(datedNotices[0]);

  const secondPass = library.notifyOverdueUsers(TODAY);
  assert(secondPass.length === 0, "An overdue notice is delivered once.");
  console.log("Second passage : aucune notification en double.");

  section("Retard simulé par un drapeau");
  const flagged = library.flagAsOverdue(patterns.transactionId);
  console.log(flagged);
  assert(
    library.getBorrowedBooks(aminata.id).some((loan) => loan.transactionId === patterns.transactionId && loan.overdue),
    "The flagged loan is visible as overdue.",
  );

  const aminataNotices = library.getNotifications(aminata.id);
  const mamadouNotices = library.getNotifications(mamadou.id);
  assert(aminataNotices.length === 1, "Aminata received the simulated notice.");
  assert(mamadouNotices.length === 1, "Mamadou received the date-based notice.");
  console.log(`Notifications d'Aminata : ${aminataNotices.join(" | ")}`);
  console.log(`Notifications de Mamadou : ${mamadouNotices.join(" | ")}`);

  assert(refactoring.overdue === false, "A fresh student loan is not overdue.");
  assert(patternsTeacher.userId === mamadou.id, "The second patterns copy belongs to the teacher.");

  section("Bilan");
  console.log(`${library.listUsers().length} utilisateurs, ${library.listBooks().length} titres, ${library.getBorrowedBooks().length} prêts actifs.`);
  console.log("Démonstration terminée.");
}

main();
