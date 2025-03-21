import { join } from 'node:path'
import { getDirname } from 'cross-dirname'
import globals from 'globals';
import fastEsm from './dist/index.js'

export default [
  {
    files: ['**/*.ts'],
    settings: {
      'fast-esm': {
        sourceRoot: join(getDirname(), 'testProject')
      }
    },
    languageOptions: {
      globals: globals.node,
    },
    // TODO: fix this weird double default thing
    plugins: { 'fast-esm': fastEsm.default },
    rules: {
      'fast-esm/no-unused-exports': 'error'
    },
  }
]