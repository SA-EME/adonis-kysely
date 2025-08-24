import type ConfigureCommand from '@adonisjs/core/commands/configure'

export type SupportedDialect = 'postgres' | 'mysql' | 'sqlite'

export interface DatabaseConfig {
  dbUser?: string
  dbPassword?: string
  dbHost?: string
  dbPort?: number
  dbName?: string
  dbPath?: string
}

export interface PackageDependency {
  name: string
  isDevDependency: boolean
}

export interface DialectChoice {
  name: SupportedDialect
  message: string
}

export interface ConfigurationContext {
  command: ConfigureCommand
  dialect: SupportedDialect
  shouldInstallPackages: boolean
  databaseConfig: DatabaseConfig
}

export interface EnvironmentVariables {
  [key: string]: string | number
}

export interface EnvironmentValidations {
  variables: Record<string, string>
  leadingComment?: string
}
