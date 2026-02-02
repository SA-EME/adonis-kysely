import type { Kysely, Transaction } from 'kysely'
import type { ExecutionContextValue } from './execution_context.js'
import type { DB } from 'adonis-kysely/types/db'

import { AsyncLocalStorage } from 'node:async_hooks'

export interface DbContextStore {
  trxStack: Transaction<DB>[]
  executionContext: Map<string, ExecutionContextValue>
  connection?: Kysely<DB>
}

/**
 * Options for dbContext.run()
 */
export interface RunOptions {
  /**
   * Initial execution context values to populate.
   * Useful for HTTP middleware to inject request-scoped data.
   *
   * When reusing existing context (idempotent): values are MERGED into existing map
   * When creating new context: values populate the fresh map
   */
  executionContext?: Record<string, ExecutionContextValue>

  /**
   * Force creation of a new isolated context even if already inside one.
   * Default: false (idempotent reuse)
   *
   * WARNING: Using forceNew=true inside an existing context creates an
   * isolated scope that LOSES access to the outer transaction stack.
   * Use only for intentional isolation (e.g., background job spawned from request).
   */
  forceNew?: boolean

  /**
   * Dedicated connection to store in context.
   * Used by runWithInjectedContext to pin a single connection
   * so session-level variables are visible to all queries.
   */
  connection?: Kysely<DB>
}

/**
 * DbContext is the single owner of AsyncLocalStorage for the application.
 *
 * It provides:
 * - Execution scope management via run()
 * - Transaction stack for nested transaction support
 * - Execution context storage for request-scoped values
 *
 * All async execution (HTTP requests, CLI commands, background jobs, tests)
 * should be wrapped in dbContext.run() to establish proper context.
 */
export class DbContext {
  #storage = new AsyncLocalStorage<DbContextStore>()

  /**
   * Execute a callback within a database context scope.
   *
   * **Idempotent by default**: If already inside a context, the callback
   * executes in the existing context (no new context created).
   *
   * Use `{ forceNew: true }` to explicitly create an isolated context.
   *
   * @example
   * ```typescript
   * // Basic usage
   * await dbContext.run(async () => {
   *   // All DB operations here share the same context
   * })
   *
   * // With initial execution context
   * await dbContext.run({
   *   executionContext: {
   *     userId: { value: user.id, injectToDb: true }
   *   }
   * }, async () => {
   *   // userId is available via executionContext.get('userId')
   * })
   *
   * // Safe nested calls (idempotent)
   * await dbContext.run(async () => {
   *   await dbContext.run(async () => {
   *     // Same context as outer - safe!
   *   })
   * })
   * ```
   */
  run<T>(callback: () => Promise<T>): Promise<T>
  run<T>(options: RunOptions, callback: () => Promise<T>): Promise<T>
  run<T>(
    optionsOrCallback: RunOptions | (() => Promise<T>),
    maybeCallback?: () => Promise<T>
  ): Promise<T> {
    const options = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback
    const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback!

    // Check if already in a context
    const existingStore = this.#storage.getStore()

    if (existingStore && !options.forceNew) {
      // IDEMPOTENT REUSE: Execute in existing context
      // Optionally merge provided executionContext values
      if (options.executionContext) {
        for (const [key, value] of Object.entries(options.executionContext)) {
          existingStore.executionContext.set(key, value)
        }
      }
      if (options.connection) {
        existingStore.connection = options.connection
      }
      return callback()
    }

    // CREATE NEW CONTEXT
    const store: DbContextStore = {
      trxStack: [],
      executionContext: new Map(
        options.executionContext ? Object.entries(options.executionContext) : []
      ),
      connection: options.connection,
    }

    return this.#storage.run(store, callback)
  }

  /**
   * Execute callback only if NOT already in a context.
   * If already in context, throws an error.
   *
   * Use when you need guaranteed fresh context (rare).
   * Typically for top-level entry points like job processors.
   *
   * @example
   * ```typescript
   * // Job processor that must have its own context
   * async processJob(job: Job) {
   *   return dbContext.runExclusive(async () => {
   *     // Guaranteed fresh context
   *   })
   * }
   * ```
   */
  runExclusive<T>(callback: () => Promise<T>): Promise<T> {
    if (this.isActive()) {
      throw new Error(
        'dbContext.runExclusive() called inside existing context. ' +
          'Use run() for idempotent behavior or run({ forceNew: true }) for isolation.'
      )
    }
    return this.run(callback)
  }

  /**
   * Get the current context store, or undefined if not in a context.
   */
  getStore(): DbContextStore | undefined {
    return this.#storage.getStore()
  }

  /**
   * Get the current context store, or throw if not in a context.
   */
  getStoreOrFail(): DbContextStore {
    const store = this.#storage.getStore()
    if (!store) {
      throw new Error('DbContext not initialized. Wrap your code in dbContext.run()')
    }
    return store
  }

  /**
   * Returns true if currently inside a dbContext.run() scope.
   */
  isActive(): boolean {
    return this.#storage.getStore() !== undefined
  }

  /**
   * Push a transaction onto the stack.
   * Called by KyselyManager when starting a transaction.
   */
  pushTransaction(trx: Transaction<DB>) {
    this.getStoreOrFail().trxStack.push(trx)
  }

  /**
   * Pop a transaction from the stack.
   * Called by KyselyManager when ending a transaction.
   */
  popTransaction() {
    this.getStoreOrFail().trxStack.pop()
  }

  /**
   * Get the current (innermost) transaction, or undefined if none.
   */
  getCurrentTransaction(): Transaction<DB> | undefined {
    const { trxStack } = this.getStoreOrFail()
    return trxStack.at(-1)
  }

  /**
   * Get the dedicated connection, or undefined if none.
   */
  getConnection(): Kysely<DB> | undefined {
    return this.#storage.getStore()?.connection
  }
}

export const dbContext = new DbContext()
