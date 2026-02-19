import { KyselyManager } from '../kysely/manager.js'
import { ExecutionContext } from '../context/execution_context.js'

declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    'adonisjs-kysely': KyselyManager
    'adonisjs-kysely/execution-context': ExecutionContext
  }
}

declare module 'adonisjs-kysely/types/db' {
  export interface DB {}
}
