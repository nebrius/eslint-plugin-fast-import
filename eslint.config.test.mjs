import fastEsm from './dist/index.js'

export default [
  {
    files: ['src/**/__test__/**/*'],
    // TODO: fix this weird double default thing
    plugins: { 'fast-esm': fastEsm.default },
    rules: {
      'fast-esm/no-unused-exports': 'error'
    },
  }
]