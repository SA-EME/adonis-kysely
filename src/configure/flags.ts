import type ConfigureCommand from '@adonisjs/core/commands/configure'

/**
 * Reads the options passed to `node ace configure`.
 *
 * ConfigureCommand sets `allowUnknownFlags`, so the options are read from the
 * parsed flags rather than declared on the command. Two parser settings matter
 * here: camel-case expansion is disabled, so `--db-host` is only available as
 * `db-host`; and boolean negation is enabled, so `--no-install` arrives as
 * `install: false`.
 */
export class ConfigureFlags {
  #flags: Record<string, unknown>

  constructor(command: ConfigureCommand) {
    this.#flags = command.parsedFlags
  }

  /**
   * `--yes` makes every unanswered prompt take its default, so the command can
   * run with no TTY at all.
   */
  get acceptDefaults(): boolean {
    return this.#flags.yes === true
  }

  /**
   * Numbers are already coerced by the parser, hence the cast back to string.
   */
  string(name: string): string | undefined {
    const value = this.#flags[name]
    if (value === undefined || value === null) return undefined
    return String(value)
  }

  boolean(name: string): boolean | undefined {
    const value = this.#flags[name]
    return typeof value === 'boolean' ? value : undefined
  }
}

/**
 * Resolve a value from a flag, then from `--yes`, and only then by prompting.
 * A flag goes through the same validation as the prompt would have.
 */
export async function resolveOption(
  command: ConfigureCommand,
  flags: ConfigureFlags,
  options: {
    flag: string
    message: string
    default: string
    validate?: (value: string) => boolean | string
  }
): Promise<string> {
  const provided = flags.string(options.flag)

  if (provided !== undefined) {
    const result = options.validate?.(provided)
    if (typeof result === 'string') {
      throw new Error(`Invalid --${options.flag} value "${provided}": ${result}`)
    }
    if (result === false) {
      throw new Error(`Invalid --${options.flag} value "${provided}"`)
    }
    return provided
  }

  if (flags.acceptDefaults) {
    return options.default
  }

  return command.prompt.ask(options.message, {
    name: options.flag.replace(/-/g, '_'),
    default: options.default,
    validate: options.validate,
  })
}

/**
 * Same as resolveOption, for a value restricted to a known set.
 */
export async function resolveChoice<T extends string>(
  command: ConfigureCommand,
  flags: ConfigureFlags,
  options: {
    flag: string
    message: string
    default: T
    choices: { name: T; message: string }[]
  }
): Promise<T> {
  const provided = flags.string(options.flag)

  if (provided !== undefined) {
    const match = options.choices.find((choice) => choice.name === provided)
    if (!match) {
      const allowed = options.choices.map((choice) => choice.name).join(', ')
      throw new Error(`Invalid --${options.flag} value "${provided}". Expected one of: ${allowed}`)
    }
    return match.name
  }

  if (flags.acceptDefaults) {
    return options.default
  }

  return command.prompt.choice(options.message, options.choices, {
    name: options.flag.replace(/-/g, '_'),
    default: options.default,
  })
}
