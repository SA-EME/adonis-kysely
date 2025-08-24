import type ConfigureCommand from '@adonisjs/core/commands/configure'
import type { SupportedDialect } from '../types/configure.js'

export async function generateConfigurationFiles(
  codemods: Awaited<ReturnType<ConfigureCommand['createCodemods']>>,
  stubsRoot: string,
  dialect: SupportedDialect
): Promise<void> {
  await codemods.makeUsingStub(stubsRoot, `config/kysely_${dialect}.stub`, {})
  await codemods.makeUsingStub(stubsRoot, 'types/db.stub', {})
}

export async function updateRcFile(
  codemods: Awaited<ReturnType<ConfigureCommand['createCodemods']>>
): Promise<void> {
  await codemods.updateRcFile((rcFile) => {
    rcFile.addCommand('adonis-kysely/commands').addProvider('adonis-kysely/kysely_provider')
  })
}
