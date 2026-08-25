/**
 * Minimal push channel feeding an async generator. Shared by every
 * SyncDatabase backend's `watch`.
 */
export class PushChannel<T> {
  private queue: T[] = [];
  private resolvers: Array<(r: IteratorResult<T>) => void> = [];
  private done = false;

  push(value: T): void {
    const resolver = this.resolvers.shift();
    if (resolver) resolver({ value, done: false });
    else this.queue.push(value);
  }

  next(): Promise<IteratorResult<T>> {
    const value = this.queue.shift();
    if (value !== undefined) {
      return Promise.resolve({ value, done: false });
    }
    if (this.done) {
      return Promise.resolve({ value: undefined as T, done: true });
    }
    return new Promise((resolve) => this.resolvers.push(resolve));
  }

  close(): void {
    this.done = true;
    const resolvers = this.resolvers.splice(0);
    for (const resolve of resolvers) resolve({ value: undefined as T, done: true });
  }
}