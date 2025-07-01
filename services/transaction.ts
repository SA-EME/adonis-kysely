import app from '@adonisjs/core/services/app'
import type { ScopedTransactionRunner } from '#src/transaction_runner'

let transactionRunner: ScopedTransactionRunner

await app.booted(async () => {
  transactionRunner = await app.container.make('adonis-kysely:transaction-runner')
})

export { transactionRunner as default }
