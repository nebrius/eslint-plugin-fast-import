import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import type { StrippedResolvedProjectInfo } from '../../../../__test__/util.js';
import { stripNodesFromResolvedInfo } from '../../../../__test__/util.js';
import { computeBaseInfo } from '../../../computeBaseInfo.js';
import { computeResolvedInfo } from '../../../computeResolvedInfo.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_INDEX = join(TEST_PROJECT_DIR, 'index.ts');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'one', 'b.ts');
const FILE_C = join(TEST_PROJECT_DIR, 'one', 'c', 'index.ts');
const FILE_C_DATA = join(TEST_PROJECT_DIR, 'one', 'c', 'data.json');
const FILE_D = join(TEST_PROJECT_DIR, 'two', 'd.js');
const FILE_D_DECLARATION = join(TEST_PROJECT_DIR, 'two', 'd.d.ts');
const FILE_E = join(TEST_PROJECT_DIR, 'two', 'e.js');
const FILE_F = join(TEST_PROJECT_DIR, 'two', 'f', 'index.js');
const FILE_F_DECLARATION = join(TEST_PROJECT_DIR, 'two', 'f', 'index.d.ts');

const EXPECTED: StrippedResolvedProjectInfo = {
  files: new Map([
    [
      FILE_C_DATA,
      {
        fileType: 'other',
      },
    ],
    [
      FILE_A,
      {
        exports: [],
        fileType: 'code',
        singleImports: [
          {
            id: 0,
            type: 'singleImport',
            importAlias: 'b1',
            importName: 'b1',
            isTypeImport: false,
            moduleSpecifier: '@/one/b',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_B,
          },
          {
            id: 1,
            type: 'singleImport',
            importAlias: 'data',
            importName: 'default',
            isTypeImport: false,
            moduleSpecifier: './one/c/data',
            resolvedModuleType: 'firstPartyOther',
            resolvedModulePath: FILE_C_DATA,
          },
          {
            id: 2,
            type: 'singleImport',
            importAlias: 'D2',
            importName: 'D2',
            isTypeImport: true,
            moduleSpecifier: './two/d',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_D_DECLARATION,
          },
          {
            id: 3,
            type: 'singleImport',
            importAlias: 'getD1',
            importName: 'getD1',
            isTypeImport: false,
            moduleSpecifier: './two/d',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_D,
          },
          {
            id: 4,
            type: 'singleImport',
            importAlias: 'e1',
            importName: 'e1',
            isTypeImport: false,
            moduleSpecifier: './two/e',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_E,
          },
          {
            id: 5,
            type: 'singleImport',
            importAlias: 'F1',
            importName: 'F1',
            isTypeImport: true,
            moduleSpecifier: './two/f',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_F_DECLARATION,
          },
          {
            id: 6,
            type: 'singleImport',
            importAlias: 'getF1',
            importName: 'getF1',
            isTypeImport: false,
            moduleSpecifier: './two/f',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_F,
          },
          {
            id: 7,
            type: 'singleImport',
            importAlias: 'join',
            importName: 'join',
            isTypeImport: false,
            moduleSpecifier: 'path',
            resolvedModuleType: 'builtin',
          },
          {
            id: 8,
            type: 'singleImport',
            importAlias: 'resolve',
            importName: 'resolve',
            isTypeImport: false,
            moduleSpecifier: 'node:path',
            resolvedModuleType: 'builtin',
          },
          {
            id: 9,
            type: 'singleImport',
            importAlias: 'parser',
            importName: 'parser',
            isTypeImport: false,
            moduleSpecifier: 'typescript-eslint',
            resolvedModuleType: 'thirdParty',
          },
          {
            id: 10,
            type: 'singleImport',
            importAlias: 'index',
            importName: 'index',
            isTypeImport: false,
            moduleSpecifier: '.',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_INDEX,
          },
          {
            id: 11,
            type: 'singleImport',
            importAlias: 'b1',
            importName: 'b1',
            isTypeImport: false,
            moduleSpecifier: '@alias',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_B,
          },
        ],
        barrelImports: [],
        dynamicImports: [],
        singleReexports: [],
        barrelReexports: [],
      },
    ],
    [
      FILE_INDEX,
      {
        exports: [
          {
            id: 12,
            type: 'export',
            exportName: 'index',
            isEntryPoint: false,
            isTypeExport: false,
          },
        ],
        fileType: 'code',
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        singleReexports: [],
        barrelReexports: [],
      },
    ],
    [
      FILE_B,
      {
        exports: [
          {
            id: 13,
            type: 'export',
            exportName: 'b1',
            isEntryPoint: false,
            isTypeExport: false,
          },
        ],
        fileType: 'code',
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        singleReexports: [],
        barrelReexports: [],
      },
    ],
    [
      FILE_C,
      {
        fileType: 'code',
        exports: [
          {
            id: 14,
            type: 'export',
            exportName: 'c1',
            isEntryPoint: false,
            isTypeExport: false,
          },
        ],
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        singleReexports: [],
        barrelReexports: [],
      },
    ],
    [
      FILE_D_DECLARATION,
      {
        exports: [
          {
            id: 15,
            type: 'export',
            exportName: 'getD1',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 16,
            type: 'export',
            exportName: 'D2',
            isEntryPoint: false,
            isTypeExport: true,
          },
        ],
        fileType: 'code',
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        singleReexports: [],
        barrelReexports: [],
      },
    ],
    [
      FILE_D,
      {
        exports: [
          {
            id: 17,
            type: 'export',
            exportName: 'getD1',
            isEntryPoint: false,
            isTypeExport: false,
          },
        ],
        fileType: 'code',
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        singleReexports: [],
        barrelReexports: [],
      },
    ],
    [
      FILE_E,
      {
        fileType: 'code',
        exports: [
          {
            id: 18,
            type: 'export',
            exportName: 'e1',
            isEntryPoint: false,
            isTypeExport: false,
          },
        ],
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        singleReexports: [],
        barrelReexports: [],
      },
    ],
    [
      FILE_F_DECLARATION,
      {
        exports: [
          {
            id: 19,
            type: 'export',
            exportName: 'F1',
            isEntryPoint: false,
            isTypeExport: true,
          },
          {
            id: 20,
            type: 'export',
            exportName: 'getF1',
            isEntryPoint: false,
            isTypeExport: false,
          },
        ],
        fileType: 'code',
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        singleReexports: [],
        barrelReexports: [],
      },
    ],
    [
      FILE_F,
      {
        fileType: 'code',
        exports: [
          {
            id: 22,
            type: 'export',
            exportName: 'getF1',
            isEntryPoint: false,
            isTypeExport: false,
          },
        ],
        singleImports: [
          {
            id: 21,
            type: 'singleImport',
            importAlias: 'fake',
            importName: 'fake',
            isTypeImport: false,
            moduleSpecifier: './fake',
            resolvedModuleType: 'firstPartyOther',
            resolvedModulePath: undefined,
          },
        ],
        barrelImports: [],
        dynamicImports: [],
        singleReexports: [],
        barrelReexports: [],
      },
    ],
  ]),
  // This takes in the already formatted version, hence why we join() here
  wildcardAliases: { '@/': TEST_PROJECT_DIR },
  fixedAliases: { '@alias': join(TEST_PROJECT_DIR, 'one/b.ts') },
  rootDir: TEST_PROJECT_DIR,
  availableThirdPartyDependencies: new Map(),
};

it('Computes resolved into', () => {
  const info = computeResolvedInfo(
    computeBaseInfo({
      rootDir: TEST_PROJECT_DIR,
      // This takes in the already formatted version, hence why we join() here
      wildcardAliases: { '@/': TEST_PROJECT_DIR },
      fixedAliases: { '@alias': join(TEST_PROJECT_DIR, 'one/b.ts') },
      ignorePatterns: [],
      isEntryPointCheck: () => false,
    })
  );

  expect(stripNodesFromResolvedInfo(info)).toEqual(EXPECTED);
});
