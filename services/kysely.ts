import type { KyselyManager } from '../src/kysely/manager.js'
import app from '@adonisjs/core/services/app'

let kyselyDB: KyselyManager
if (app) {
  await app.booted(async () => {
    kyselyDB = await app.container.make('adonis-kysely')
  })
}

export { kyselyDB as default }
