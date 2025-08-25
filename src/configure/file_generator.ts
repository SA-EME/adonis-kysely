import type ConfigureCommand from '@adonisjs/core/commands/configure'
import type { SupportedDialect, LoggingOption } from '../types/configure.js'

export async function generateConfigurationFiles(
  codemods: Awaited<ReturnType<ConfigureCommand['createCodemods']>>,
  stubsRoot: string,
  dialect: SupportedDialect,
  loggingOption: LoggingOption
): Promise<void> {
  const hasLogging = loggingOption !== 'none'

  await codemods.makeUsingStub(stubsRoot, `config/kysely_${dialect}.stub`, { hasLogging })
  await codemods.makeUsingStub(stubsRoot, 'types/db.stub', {})

  if (hasLogging) {
    await codemods.makeUsingStub(stubsRoot, 'config/logs.stub', {})
  }
}

export async function updateRcFile(
  codemods: Awaited<ReturnType<ConfigureCommand['createCodemods']>>
): Promise<void> {
  await codemods.updateRcFile((rcFile) => {
    rcFile.addCommand('adonis-kysely/commands').addProvider('adonis-kysely/kysely_provider')
  })
}
