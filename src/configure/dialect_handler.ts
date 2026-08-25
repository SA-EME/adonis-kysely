import type ConfigureCommand from '@adonisjs/core/commands/configure'
import type {
  SupportedDialect,
  DatabaseConfig,
  DialectChoice,
  LoggingOption,
  LoggingChoice,
} from '../types/configure.js'
import { resolveChoice, resolveOption, type ConfigureFlags } from './flags.js'

const DIALECT_CHOICES: DialectChoice[] = [
  { name: 'postgres', message: 'Postgres' },
  { name: 'mysql', message: 'MySQL' },
  { name: 'sqlite', message: 'SQLite' },
]

const DIALECT_DEFAULTS = {
  postgres: {
    user: 'postgres',
    password: 'postgres',
    port: '5432',
  },
  mysql: {
    user: 'root',
    password: 'root',
    port: '3306',
  },
} as const

export async function selectDialect(
  command: ConfigureCommand,
  flags: ConfigureFlags
): Promise<SupportedDialect> {
  return resolveChoice(command, flags, {
    flag: 'db',
    message: 'What database dialect you want to use with Adonis Kysely?',
    default: 'postgres',
    choices: DIALECT_CHOICES,
  })
}

export async function collectSqliteConfig(
  command: ConfigureCommand,
  flags: ConfigureFlags
): Promise<DatabaseConfig> {
  const dbPath = await resolveOption(command, flags, {
    flag: 'db-path',
    message: 'What is the path to your SQLite database file?',
    default: 'database.sqlite',
  })

  return { dbPath }
}

export async function collectNetworkDatabaseConfig(
  command: ConfigureCommand,
  flags: ConfigureFlags,
  dialect: 'postgres' | 'mysql'
): Promise<DatabaseConfig> {
  const defaults = DIALECT_DEFAULTS[dialect]

  const dbUser = await resolveOption(command, flags, {
    flag: 'db-user',
    message: 'What is the user of your database?',
    default: defaults.user,
  })

  const dbPassword = await resolveOption(command, flags, {
    flag: 'db-password',
    message: 'What is the password of your database?',
    default: defaults.password,
  })

  const dbHost = await resolveOption(command, flags, {
    flag: 'db-host',
    message: 'What is the host of your database?',
    default: 'localhost',
  })

  const dbPort = await resolveOption(command, flags, {
    flag: 'db-port',
    message: 'What is the port of your database?',
    default: defaults.port,
    validate: validatePortNumber,
  })

  const dbName = await resolveOption(command, flags, {
    flag: 'db-name',
    message: 'What is the name of your database?',
    default: 'database',
  })

  return {
    dbUser,
    dbPassword,
    dbHost,
    dbPort: Number.parseInt(dbPort, 10),
    dbName,
  }
}

function validatePortNumber(value: string): boolean | string {
  const port = Number.parseInt(value, 10)
  return !Number.isNaN(port) && port > 0 && port < 65536
    ? true
    : 'Please enter a valid port number between 1 and 65535'
}

// TODO; custom will be implemented in future
const LOGGING_CHOICES: LoggingChoice[] = [
  { name: 'none', message: 'No logging' },
  { name: 'console', message: 'Console logging (development)' },
  { name: 'adonisjs-logger', message: 'AdonisJS Logger (recommended)' },
  { name: 'custom', message: 'Custom logging setup (wip)' },
]

export async function selectLoggingOption(
  command: ConfigureCommand,
  flags: ConfigureFlags
): Promise<LoggingOption> {
  return resolveChoice(command, flags, {
    flag: 'logging',
    message: 'What logging option would you like to use for database queries?',
    default: 'adonisjs-logger',
    choices: LOGGING_CHOICES,
  })
}
