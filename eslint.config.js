import { configApp } from '@adonisjs/eslint-config'

const config = configApp({
  languageOptions: {
    parserOptions: {
      tsconfigRootDir: import.meta.dirname,
    },
  },
})

// Add ignore configuration
config.push({
  ignores: ['example/**/*'],
})

export default config
