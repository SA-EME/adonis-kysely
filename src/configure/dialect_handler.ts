import type ConfigureCommand from '@adonisjs/core/commands/configure'
import type {
  SupportedDialect,
  DatabaseConfig,
  DialectChoice,
  LoggingOption,
  LoggingChoice,
} from '../types/configure.js'

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
  flagDialect?: string
): Promise<SupportedDialect> {
  return await command.prompt.choice(
    'What database dialect you want to use with Adonis Kysely?',
    DIALECT_CHOICES,
    {
      name: 'db',
      default: flagDialect || 'postgres',
    }
  )
}

export async function collectSqliteConfig(command: ConfigureCommand): Promise<DatabaseConfig> {
  const dbPath = await command.prompt.ask('What is the path to your SQLite database file?', {
    name: 'db_path',
    default: 'database.sqlite',
  })

  return { dbPath }
}

export async function collectNetworkDatabaseConfig(
  command: ConfigureCommand,
  dialect: 'postgres' | 'mysql'
): Promise<DatabaseConfig> {
  const defaults = DIALECT_DEFAULTS[dialect]

  const dbUser = await command.prompt.ask('What is the user of your database?', {
    name: 'db_user',
    default: defaults.user,
  })

  const dbPassword = await command.prompt.ask('What is the password of your database?', {
    name: 'db_password',
    default: defaults.password,
  })

  const dbHost = await command.prompt.ask('What is the host of your database?', {
    name: 'db_host',
    default: 'localhost',
  })

  const dbPort = await command.prompt.ask('What is the port of your database?', {
    name: 'db_port',
    default: defaults.port,
    validate: validatePortNumber,
  })

  const dbName = await command.prompt.ask('What is the name of your database?', {
    name: 'db_name',
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

export async function selectLoggingOption(command: ConfigureCommand): Promise<LoggingOption> {
  return await command.prompt.choice(
    'What logging option would you like to use for database queries?',
    LOGGING_CHOICES,
    {
      name: 'logging',
      default: 'adonisjs-logger',
    }
  )
}
