import type ConfigureCommand from '@adonisjs/core/commands/configure'

// modules/ace/codemods.js
import type {
  SupportedDialect,
  DatabaseConfig,
  EnvironmentVariables,
  EnvironmentValidations,
} from '../types/configure.js'

export function generateEnvironmentVariables(
  dialect: SupportedDialect,
  databaseConfig: DatabaseConfig
): EnvironmentVariables {
  if (dialect === 'sqlite') {
    return {
      DB_PATH: databaseConfig.dbPath ?? '',
    }
  }

  return {
    DB_HOST: databaseConfig.dbHost ?? '',
    DB_PORT: databaseConfig.dbPort ?? '',
    DB_USER: databaseConfig.dbUser ?? '',
    DB_PASSWORD: databaseConfig.dbPassword ?? '',
    DB_DATABASE: databaseConfig.dbName ?? '',
  }
}

export function generateEnvironmentValidations(dialect: SupportedDialect): EnvironmentValidations {
  if (dialect === 'sqlite') {
    return {
      variables: {
        DB_PATH: 'Env.schema.string()',
      },
      leadingComment: 'Variables for configuring the database connection',
    }
  }

  return {
    variables: {
      DB_HOST: 'Env.schema.string()',
      DB_PORT: 'Env.schema.number()',
      DB_USER: 'Env.schema.string()',
      DB_PASSWORD: 'Env.schema.string()',
      DB_DATABASE: 'Env.schema.string()',
    },
    leadingComment: 'Variables for configuring the database connection',
  }
}

export function generateDatabaseUrl(
  dialect: SupportedDialect,
  databaseConfig: DatabaseConfig
): string {
  if (dialect === 'sqlite') {
    return `${dialect}://${databaseConfig.dbPath}`
  }

  return `${dialect}://${databaseConfig.dbUser}:${databaseConfig.dbPassword}@${databaseConfig.dbHost}:${databaseConfig.dbPort}/${databaseConfig.dbName}`
}

export async function setupEnvironmentVariables(
  codemods: Awaited<ReturnType<ConfigureCommand['createCodemods']>>,
  dialect: SupportedDialect,
  databaseConfig: DatabaseConfig
): Promise<void> {
  const envVars = generateEnvironmentVariables(dialect, databaseConfig)
  const envValidations = generateEnvironmentValidations(dialect)
  const databaseUrl = generateDatabaseUrl(dialect, databaseConfig)

  await codemods.defineEnvVariables(envVars)
  await codemods.defineEnvValidations(envValidations)
  await codemods.defineEnvVariables({ DATABASE_URL: databaseUrl })
}
