import { LibraryError } from "../errors/LibraryError.js";
import type { Book } from "./Book.js";

/** Book-management subsystem: the library catalog. */
export class BookCatalog {
  readonly #books = new Map<string, Book>();

  add(book: Book): void {
    if (this.#books.has(book.isbn)) {
      throw new LibraryError(`Book with ISBN "${book.isbn}" already exists.`);
    }
    this.#books.set(book.isbn, book);
  }

  require(isbn: string): Book {
    const book = this.#books.get(isbn);
    if (!book) {
      throw new LibraryError(`Unknown book ISBN: "${isbn}".`);
    }
    return book;
  }

  list(): Book[] {
    return [...this.#books.values()];
  }
}
