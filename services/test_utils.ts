import type { KyselyManager } from '../src/kysely/manager.js'
import { KyselyTestUtils } from '../src/testing/test_utils.js'
import app from '@adonisjs/core/services/app'

let kyselyDB: KyselyManager
let kyselyTestUtils: KyselyTestUtils
if (app) {
  await app.booted(async () => {
    kyselyDB = await app.container.make('adonisjs-kysely')
    kyselyTestUtils = new KyselyTestUtils(kyselyDB, app)
  })
}

export { kyselyTestUtils as default }
