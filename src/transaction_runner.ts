import type { AdonisKyselyDB } from '#src/kysely_db'

export class ScopedTransactionRunner {
  #adonisKysely: AdonisKyselyDB

  constructor(adonisKysely: AdonisKyselyDB) {
    this.#adonisKysely = adonisKysely
  }

  /**
   * Run a function in a transaction (auto-commit or rollback).
   */
  async run<T>(callback: () => Promise<T>): Promise<T> {
    return await this.#adonisKysely.runInTransaction(callback)
  }

  /**
   * Start a transaction and return a handle.
   */
  async start(): Promise<ScopedTransactionHandle | undefined> {
    const id = await this.#adonisKysely.startTransaction()
    if (!id) return undefined
    return new ScopedTransactionHandle(this.#adonisKysely, id)
  }
}

export class ScopedTransactionHandle {
  #adonisKysely: AdonisKyselyDB
  #id: string

  constructor(adonisKysely: AdonisKyselyDB, id: string) {
    this.#adonisKysely = adonisKysely
    this.#id = id
  }

  get id() {
    return this.#id
  }

  async run<T>(callback: () => Promise<T>): Promise<T> {
    return this.#adonisKysely.getContext().run(this.#id, callback)
  }

  getConnection() {
    return this.#adonisKysely.getTransaction(this.#id)
  }

  async commit() {
    await this.#adonisKysely.commitTransaction(this.#id)
  }

  async rollback() {
    await this.#adonisKysely.rollbackTransaction(this.#id)
  }
}
