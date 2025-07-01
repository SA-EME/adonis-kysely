import { AsyncLocalStorage } from 'node:async_hooks'

export class TransactionContext {
  #storage = new AsyncLocalStorage<{ trxId: string }>()

  run<T>(trxId: string, callback: () => Promise<T>): Promise<T> {
    return this.#storage.run({ trxId }, callback)
  }

  get(): string | null {
    const store = this.#storage.getStore()
    return store?.trxId ?? null
  }

  clear() {
    this.#storage.disable()
  }
}
