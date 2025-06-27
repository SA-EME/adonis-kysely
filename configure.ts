/*
|--------------------------------------------------------------------------
| Configure hook
|--------------------------------------------------------------------------
|
| The configure hook is called when someone runs "node ace configure <package>"
| command. You are free to perform any operations inside this function to
| configure the package.
|
| To make things easier, you have access to the underlying "ConfigureCommand"
| instance and you can use codemods to modify the source files.
|
*/

import type ConfigureCommand from '@adonisjs/core/commands/configure'
import { stubsRoot } from './stubs/main.js'

export async function configure(command: ConfigureCommand) {
  const codemods = await command.createCodemods()

  await codemods.makeUsingStub(stubsRoot, 'config/kysely.stub', {})
  // TODO, find a way to use rootPath
  await codemods.makeUsingStub(stubsRoot, 'types/db.stub', {})

  await codemods.defineEnvVariables({
    DATABASE_URL: '[postgres]://[postgres]:[postgres]@127.0.0.1:[5432]/[table]',
  })

  await codemods.updateRcFile((rcFile) => {
    rcFile.addCommand('adonis-kysely/commands').addProvider('adonis-kysely/kysely_provider')
  })
}
