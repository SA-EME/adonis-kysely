import { AdonisKyselyDB } from '#src/kysely_db'
import { ScopedTransactionRunner } from '#src/transaction_runner'

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    'adonis-kysely': AdonisKyselyDB
    'adonis-kysely:transaction-runner': ScopedTransactionRunner
  }
}

declare module 'adonis-kysely/types/db' {
  export interface DB {}
}
