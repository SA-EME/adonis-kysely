import type ConfigureCommand from '@adonisjs/core/commands/configure'
import { stubsRoot } from './stubs/main.js'
import {
  selectDialect,
  collectSqliteConfig,
  collectNetworkDatabaseConfig,
  selectLoggingOption,
} from './src/configure/dialect_handler.js'
import {
  getRequiredPackages,
  confirmPackageInstallation,
  installPackages,
} from './src/configure/package_manager.js'
import { setupEnvironmentVariables } from './src/configure/environment_setup.js'
import { generateConfigurationFiles, updateRcFile } from './src/configure/file_generator.js'
import type { DatabaseConfig } from './src/types/configure.js'

export async function configure(command: ConfigureCommand) {
  const codemods = await command.createCodemods()

  const dialect = await selectDialect(command, command.parsedFlags.db)

  let databaseConfig: DatabaseConfig
  if (dialect === 'sqlite') {
    databaseConfig = await collectSqliteConfig(command)
  } else {
    databaseConfig = await collectNetworkDatabaseConfig(command, dialect)
  }

  const loggingOption = await selectLoggingOption(command)

  const shouldInstallPackages = await confirmPackageInstallation(command)
  const requiredPackages = getRequiredPackages(dialect)

  if (shouldInstallPackages) {
    await installPackages(command, requiredPackages)
  }

  await setupEnvironmentVariables(codemods, dialect, databaseConfig)

  await generateConfigurationFiles(codemods, stubsRoot, dialect, loggingOption)
  await updateRcFile(codemods)
}
