/** Receives messages published by a subject (Observer pattern). */
export interface Observer {
  update(message: string): void;
}
