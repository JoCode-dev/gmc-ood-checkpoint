import type { Observer } from "./Observer.js";

/**
 * Subject of the Observer pattern.
 * Users subscribe with their id and receive overdue notices through `update`.
 */
export class NotificationService {
  readonly #subscribers = new Map<string, Observer>();

  subscribe(userId: string, observer: Observer): void {
    this.#subscribers.set(userId, observer);
  }

  unsubscribe(userId: string): void {
    this.#subscribers.delete(userId);
  }

  isSubscribed(userId: string): boolean {
    return this.#subscribers.has(userId);
  }

  /** Delivers a message to one subscriber. Returns false when nobody is listening. */
  notify(userId: string, message: string): boolean {
    const observer = this.#subscribers.get(userId);
    if (!observer) {
      return false;
    }

    observer.update(message);
    return true;
  }
}
