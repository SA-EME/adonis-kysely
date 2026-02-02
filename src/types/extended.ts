import { KyselyManager } from '../kysely/manager.js'
import { ExecutionContext } from '../context/execution_context.js'

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    'adonis-kysely': KyselyManager
    'adonis-kysely/execution-context': ExecutionContext
  }
}

declare module 'adonis-kysely/types/db' {
  export interface DB {}
}
