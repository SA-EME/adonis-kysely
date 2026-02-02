import type { ExecutionContext } from '../src/context/execution_context.js'
import app from '@adonisjs/core/services/app'

let executionContext: ExecutionContext
if (app) {
  await app.booted(async () => {
    executionContext = await app.container.make('adonis-kysely/execution-context')
  })
}

export { executionContext as default }
