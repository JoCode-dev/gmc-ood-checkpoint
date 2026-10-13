import { LibraryError } from "../errors/LibraryError.js";

/** A catalog entry. Copies on the shelf are encapsulated. */
export class Book {
  readonly isbn: string;
  readonly title: string;
  readonly author: string;
  readonly #totalCopies: number;
  #availableCopies: number;

  constructor(isbn: string, title: string, author: string, copies: number) {
    const normalizedIsbn = isbn.trim();
    const normalizedTitle = title.trim();
    const normalizedAuthor = author.trim();

    if (!normalizedIsbn) {
      throw new LibraryError("ISBN is required.");
    }
    if (!normalizedTitle) {
      throw new LibraryError("Book title is required.");
    }
    if (!normalizedAuthor) {
      throw new LibraryError("Book author is required.");
    }
    if (!Number.isInteger(copies) || copies < 1) {
      throw new LibraryError("A book must be added with at least one copy.");
    }

    this.isbn = normalizedIsbn;
    this.title = normalizedTitle;
    this.author = normalizedAuthor;
    this.#totalCopies = copies;
    this.#availableCopies = copies;
  }

  get totalCopies(): number {
    return this.#totalCopies;
  }

  get availableCopies(): number {
    return this.#availableCopies;
  }

  get isAvailable(): boolean {
    return this.#availableCopies > 0;
  }

  checkout(): void {
    if (!this.isAvailable) {
      throw new LibraryError(`"${this.title}" is not available.`);
    }
    this.#availableCopies -= 1;
  }

  checkin(): void {
    if (this.#availableCopies >= this.#totalCopies) {
      throw new LibraryError(`All copies of "${this.title}" are already on the shelf.`);
    }
    this.#availableCopies += 1;
  }
}
