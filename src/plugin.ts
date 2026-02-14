import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { TSESLint } from '@typescript-eslint/utils';
import { getDirname } from 'cross-dirname';

import { noCycle } from './rules/cycle/cycle.js';
import { noEntryPointImports } from './rules/entryPoint/entryPoint.js';
import { consistentFileExtensions } from './rules/extension/extension.js';
import { noExternalBarrelReexports } from './rules/externalBarrelReexports/externalBarrelReexports.js';
import { namedAsDefault } from './rules/namedAsDefault/namedAsDefault.js';
import { noNodeBuiltins } from './rules/nodeBuiltins/nodeBuiltins.js';
import { nodePrefix } from './rules/nodePrefix/nodePrefix.js';
import { noRestrictedImports } from './rules/restricted/restricted.js';
import { noTestImportsInProd } from './rules/testInProd/testInProd.js';
import { noUnresolvedImports } from './rules/unresolved/unresolved.js';
import { noUnusedExports } from './rules/unused/unused.js';
import type { UserSettings } from './settings/user.js';

// Helper exports
export {
  getESMInfo,
  registerUpdateListener,
  isNonTestFile,
} from './rules/util.js';

// Plugin export
const { name, version } = JSON.parse(
  readFileSync(join(getDirname(), '..', 'package.json'), 'utf8')
) as { name: string; version: string };

const plugin = {
  meta: {
    name,
    version,
  },
  configs: {},
  rules: {
    'consistent-file-extensions': consistentFileExtensions,
    'no-unused-exports': noUnusedExports,
    'no-cycle': noCycle,
    'no-entry-point-imports': noEntryPointImports,
    'no-unresolved-imports': noUnresolvedImports,
    'no-external-barrel-reexports': noExternalBarrelReexports,
    'no-test-imports-in-prod': noTestImportsInProd,
    'no-named-as-default': namedAsDefault,
    'no-node-builtins': noNodeBuiltins,
    'require-node-prefix': nodePrefix,
    'no-restricted-imports': noRestrictedImports,
  },
  processors: {},
};

const recommendedConfig = {
  plugins: {
    'fast-import': plugin,
  },
  rules: {
    'fast-import/no-unused-exports': 'error',
    'fast-import/no-cycle': 'error',
    'fast-import/no-entry-point-imports': 'error',
    'fast-import/no-unresolved-imports': 'error',
    'fast-import/no-external-barrel-reexports': 'error',
    'fast-import/no-test-imports-in-prod': 'error',
    'fast-import/no-named-as-default': 'error',
    'fast-import/require-node-prefix': 'off',
  },
} as const;

const allConfig = {
  plugins: {
    'fast-import': plugin,
  },
  rules: {
    'fast-import/consistent-file-extensions': 'error',
    'fast-import/no-unused-exports': 'error',
    'fast-import/no-cycle': 'error',
    'fast-import/no-entry-point-imports': 'error',
    'fast-import/no-unresolved-imports': 'error',
    'fast-import/no-external-barrel-reexports': 'error',
    'fast-import/no-test-imports-in-prod': 'error',
    'fast-import/no-named-as-default': 'error',
    'fast-import/require-node-prefix': 'error',
  },
} as const;

const offConfig = {
  plugins: {
    'fast-import': plugin,
  },
  rules: {
    'fast-import/consistent-file-extensions': 'off',
    'fast-import/no-unused-exports': 'off',
    'fast-import/no-cycle': 'off',
    'fast-import/no-entry-point-imports': 'off',
    'fast-import/no-unresolved-imports': 'off',
    'fast-import/no-external-barrel-reexports': 'off',
    'fast-import/no-test-imports-in-prod': 'off',
    'fast-import/no-named-as-default': 'off',
    'fast-import/no-node-builtins': 'off',
    'fast-import/require-node-prefix': 'off',
    'fast-import/no-restricted-imports': 'off',
  },
} as const;

Object.assign(plugin.configs, {
  recommended: recommendedConfig,
  all: allConfig,
  off: offConfig,
});

export default plugin;

type ExtendedSettings = UserSettings & {
  requireFileExtensions?: boolean;
};

type ConfigArgs = ExtendedSettings | string;

function processArgs(args: ConfigArgs): ExtendedSettings {
  if (typeof args === 'string') {
    const rootDir = args;
    const configPath = join(rootDir, 'fast-import.config.json');
    let configContent: string;
    let parsedConfig: unknown;

    try {
      configContent = readFileSync(configPath, 'utf8');
    } catch (error) {
      throw new Error(
        `Failed to read config file at "${configPath}": ${error instanceof Error ? error.message : String(error)}`
      );
    }

    try {
      parsedConfig = JSON.parse(configContent);
    } catch (error) {
      throw new Error(
        `Failed to parse config file at "${configPath}": ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (typeof parsedConfig !== 'object' || parsedConfig === null) {
      throw new Error(
        `Config file at "${configPath}" must contain a JSON object`
      );
    }

    const config = parsedConfig as ExtendedSettings;

    if (config.rootDir) {
      throw new Error(
        `Config file at "${configPath}" must not contain a "rootDir" property when loading from a directory path`
      );
    }

    config.rootDir = rootDir;

    return config;
  }

  return args;
}

export function recommended(args: ConfigArgs): TSESLint.FlatConfig.Config {
  const { requireFileExtensions, ...settings } = processArgs(args);
  return {
    ...{
      ...recommendedConfig,
      rules: {
        ...recommendedConfig.rules,
        'fast-import/consistent-file-extensions': [
          'error',
          {
            mode: requireFileExtensions !== false ? 'always' : 'never',
          },
        ],
      },
    },
    settings: {
      'fast-import': settings,
    },
  };
}

export function all(args: ConfigArgs): TSESLint.FlatConfig.Config {
  const { requireFileExtensions, ...settings } = processArgs(args);
  return {
    ...{
      ...allConfig,
      rules: {
        ...allConfig.rules,
        'fast-import/consistent-file-extensions': [
          'error',
          {
            mode: requireFileExtensions !== false ? 'always' : 'never',
          },
        ],
      },
    },
    settings: {
      'fast-import': settings,
    },
  };
}
