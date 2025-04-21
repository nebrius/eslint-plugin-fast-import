import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import type { StrippedAnalyzedProjectInfo } from '../../../../__test__/util.js';
import { stripNodesFromAnalyzedInfo } from '../../../../__test__/util.js';
import { computeAnalyzedInfo } from '../../../computeAnalyzedInfo.js';
import { computeBaseInfo } from '../../../computeBaseInfo.js';
import { computeResolvedInfo } from '../../../computeResolvedInfo.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'b.ts');
const FILE_C = join(TEST_PROJECT_DIR, 'c.ts');
const FILE_D = join(TEST_PROJECT_DIR, 'd.ts');
const FILE_E = join(TEST_PROJECT_DIR, 'e.ts');
const FILE_F = join(TEST_PROJECT_DIR, 'f.ts');
const FILE_G = join(TEST_PROJECT_DIR, 'g.ts');
const FILE_H = join(TEST_PROJECT_DIR, 'h.json');

const CYCLE_FILE_A = join(TEST_PROJECT_DIR, 'cycle-a.js');
const CYCLE_FILE_B = join(TEST_PROJECT_DIR, 'cycle-b.js');
const CYCLE_FILE_C = join(TEST_PROJECT_DIR, 'cycle-c.js');

const EXPECTED: StrippedAnalyzedProjectInfo = {
  files: new Map([
    [
      FILE_H,
      {
        fileType: 'other',
      },
    ],
    [
      FILE_A,
      {
        fileType: 'code',
        singleImports: [
          {
            type: 'singleImport',
            moduleSpecifier: './b',
            importName: 'c1',
            importAlias: 'c1',
            isTypeImport: false,
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_B,
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_C,
            rootExportName: 'c1',
            rootExportType: 'export',
          },
          {
            type: 'singleImport',
            moduleSpecifier: './e',
            importName: 'd1',
            importAlias: 'd1',
            isTypeImport: false,
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_E,
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_D,
            rootExportName: 'd1',
            rootExportType: 'export',
          },
          {
            type: 'singleImport',
            moduleSpecifier: './e',
            importName: 'f',
            importAlias: 'f',
            isTypeImport: false,
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_E,
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_E,
            rootExportName: 'f',
            rootExportType: 'namedBarrelReexport',
          },
          {
            type: 'singleImport',
            moduleSpecifier: './f',
            importName: 'join',
            importAlias: 'join',
            resolvedModulePath: FILE_F,
            isTypeImport: false,
            resolvedModuleType: 'firstPartyCode',
            rootModuleType: 'builtin',
          },
          {
            type: 'singleImport',
            moduleSpecifier: './g?raw',
            importName: 'SourceCode',
            importAlias: 'SourceCode',
            resolvedModulePath: FILE_G,
            isTypeImport: false,
            resolvedModuleType: 'firstPartyCode',
            rootModuleType: undefined,
          },
          {
            type: 'singleImport',
            importAlias: 'h',
            importName: 'default',
            isTypeImport: false,
            moduleSpecifier: './h.json',
            resolvedModuleType: 'firstPartyOther',
            resolvedModulePath: FILE_H,
            rootModuleType: undefined,
          },
        ],
        barrelImports: [
          {
            type: 'barrelImport',
            importAlias: 'b',
            moduleSpecifier: './b',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_B,
          },
        ],
        dynamicImports: [],
        exports: [],
        singleReexports: [
          {
            type: 'singleReexport',
            barrelImportedByFiles: [],
            exportName: 'ASourceCode',
            importName: 'SourceCode',
            importedByFiles: [],
            isEntryPoint: true,
            isTypeReexport: true,
            moduleSpecifier: './f',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_F,
            rootModuleType: 'thirdParty',
          },
        ],
        barrelReexports: [],
      },
    ],
    [
      FILE_B,
      {
        fileType: 'code',
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        exports: [],
        singleReexports: [],
        barrelReexports: [
          {
            type: 'barrelReexport',
            moduleSpecifier: './c',
            exportName: undefined,
            isEntryPoint: false,
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_C,
            importedByFiles: [FILE_A],
            barrelImportedByFiles: [FILE_A],
          },
          {
            type: 'barrelReexport',
            moduleSpecifier: './d',
            exportName: undefined,
            isEntryPoint: false,
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_D,
            importedByFiles: [],
            barrelImportedByFiles: [FILE_A],
          },
        ],
      },
    ],
    [
      FILE_C,
      {
        fileType: 'code',
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        exports: [
          {
            type: 'export',
            exportName: 'c1',
            isEntryPoint: false,
            isTypeExport: false,
            importedByFiles: [FILE_A],
            barrelImportedByFiles: [FILE_A],
          },
        ],
        singleReexports: [],
        barrelReexports: [],
      },
    ],
    [
      CYCLE_FILE_A,
      {
        exports: [],
        fileType: 'code',
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        singleReexports: [
          {
            type: 'singleReexport',
            barrelImportedByFiles: [],
            exportName: 'a',
            importName: 'a',
            importedByFiles: [],
            isEntryPoint: false,
            isTypeReexport: false,
            moduleSpecifier: './cycle-b',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: CYCLE_FILE_B,
            rootModuleType: undefined,
          },
        ],
        barrelReexports: [],
      },
    ],
    [
      CYCLE_FILE_B,
      {
        exports: [],
        fileType: 'code',
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        singleReexports: [
          {
            type: 'singleReexport',
            barrelImportedByFiles: [],
            exportName: 'a',
            importName: 'a',
            importedByFiles: [],
            isEntryPoint: false,
            isTypeReexport: false,
            moduleSpecifier: './cycle-c',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: CYCLE_FILE_C,
            rootModuleType: undefined,
          },
        ],
        barrelReexports: [],
      },
    ],
    [
      CYCLE_FILE_C,
      {
        exports: [],
        fileType: 'code',
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        singleReexports: [
          {
            type: 'singleReexport',
            barrelImportedByFiles: [],
            exportName: 'a',
            importName: 'a',
            importedByFiles: [],
            isEntryPoint: false,
            isTypeReexport: false,
            moduleSpecifier: './cycle-a',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: CYCLE_FILE_A,
            rootModuleType: undefined,
          },
        ],
        barrelReexports: [],
      },
    ],
    [
      FILE_D,
      {
        fileType: 'code',
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        exports: [
          {
            type: 'export',
            exportName: 'd1',
            isEntryPoint: false,
            isTypeExport: false,
            importedByFiles: [FILE_A],
            barrelImportedByFiles: [FILE_A],
          },
        ],
        singleReexports: [],
        barrelReexports: [],
      },
    ],
    [
      FILE_E,
      {
        fileType: 'code',
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        exports: [],
        singleReexports: [
          {
            type: 'singleReexport',
            moduleSpecifier: './d',
            importName: 'd1',
            exportName: 'd1',
            isTypeReexport: false,
            isEntryPoint: false,
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_D,
            importedByFiles: [FILE_A],
            barrelImportedByFiles: [],
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_D,
            rootExportName: 'd1',
            rootExportType: 'export',
          },
        ],
        barrelReexports: [
          {
            type: 'barrelReexport',
            moduleSpecifier: './f',
            exportName: 'f',
            isEntryPoint: false,
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_F,
            importedByFiles: [],
            barrelImportedByFiles: [],
          },
        ],
      },
    ],
    [
      FILE_F,
      {
        fileType: 'code',
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        exports: [],
        singleReexports: [
          {
            type: 'singleReexport',
            moduleSpecifier: 'path',
            importName: 'join',
            exportName: 'join',
            isTypeReexport: false,
            isEntryPoint: false,
            resolvedModuleType: 'builtin',
            importedByFiles: [],
            barrelImportedByFiles: [],
            rootModuleType: 'builtin',
          },
          {
            type: 'singleReexport',
            barrelImportedByFiles: [],
            exportName: 'SourceCode',
            importName: 'SourceCode',
            importedByFiles: [],
            isEntryPoint: false,
            isTypeReexport: true,
            moduleSpecifier: 'eslint',
            resolvedModuleType: 'thirdParty',
            rootModuleType: 'thirdParty',
          },
        ],
        barrelReexports: [],
      },
    ],
    [
      FILE_G,
      {
        fileType: 'code',
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        exports: [],
        singleReexports: [],
        barrelReexports: [
          {
            type: 'barrelReexport',
            moduleSpecifier: 'eslint',
            exportName: undefined,
            isEntryPoint: false,
            resolvedModuleType: 'thirdParty',
            importedByFiles: [],
            barrelImportedByFiles: [],
          },
        ],
      },
    ],
  ]),
  rootDir: TEST_PROJECT_DIR,
  wildcardAliases: {},
  fixedAliases: {},
  availableThirdPartyDependencies: new Map(),
};

it('Computes base info', () => {
  const info = computeAnalyzedInfo(
    computeResolvedInfo(
      computeBaseInfo({
        rootDir: TEST_PROJECT_DIR,
        wildcardAliases: {},
        fixedAliases: {},
        ignorePatterns: [],
        isEntryPointCheck: (filePath, symbolName) =>
          filePath === FILE_A && symbolName === 'ASourceCode',
      })
    )
  );
  expect(stripNodesFromAnalyzedInfo(info)).toEqual(EXPECTED);
});
