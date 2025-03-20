import { join } from 'node:path'
import { getDirname } from 'cross-dirname'
import fastEsm from './dist/index.js'

export default [
  {
    settings: {
      'fast-esm': {
        sourceRoot: join(getDirname(), 'src')
      }
    },
    files: ['testProject/**/*'],
    // TODO: fix this weird double default thing
    plugins: { 'fast-esm': fastEsm.default },
    rules: {
      'fast-esm/no-unused-exports': 'error'
    },
  }
]