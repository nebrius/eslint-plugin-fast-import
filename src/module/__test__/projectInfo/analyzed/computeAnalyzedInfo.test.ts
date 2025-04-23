import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import type { StrippedAnalyzedFileDetails } from '../../../../__test__/util.js';
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

const EXPECTED_FILE_A: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  hasEntryPoints: false,
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
      rootExportEntry: {
        type: 'export',
        exportName: 'c1',
        isEntryPoint: false,
        isTypeExport: false,
      },
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
      rootExportEntry: {
        type: 'export',
        exportName: 'd1',
        isEntryPoint: false,
        isTypeExport: false,
      },
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
      rootExportEntry: {
        type: 'barrelReexport',
        exportName: 'f',
        isEntryPoint: false,
        moduleSpecifier: './f',
        resolvedModulePath: FILE_F,
        resolvedModuleType: 'firstPartyCode',
      },
    },
    {
      type: 'singleImport',
      moduleSpecifier: './f',
      importName: 'join',
      importAlias: 'join',
      isTypeImport: false,
      resolvedModulePath: FILE_F,
      resolvedModuleType: 'firstPartyCode',
      rootModuleType: 'builtin',
    },
    {
      type: 'singleImport',
      moduleSpecifier: './g?raw',
      importName: 'SourceCode',
      importAlias: 'SourceCode',
      isTypeImport: false,
      resolvedModulePath: FILE_G,
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
      barrelImportedBy: [],
      exportName: 'ASourceCode',
      importName: 'SourceCode',
      importedBy: [],
      isEntryPoint: true,
      isTypeReexport: true,
      moduleSpecifier: './f',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_F,
      rootModuleType: 'thirdParty',
    },
  ],
  barrelReexports: [],
};

const EXPECTED_FILE_B: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  hasEntryPoints: false,
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
      importedBy: [],
      barrelImportedBy: [],
    },
    {
      type: 'barrelReexport',
      moduleSpecifier: './d',
      exportName: undefined,
      isEntryPoint: false,
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_D,
      importedBy: [],
      barrelImportedBy: [],
    },
  ],
};

const EXPECTED_FILE_C: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  hasEntryPoints: false,
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  exports: [
    {
      type: 'export',
      exportName: 'c1',
      isEntryPoint: false,
      isTypeExport: false,
      importedBy: [
        {
          filePath: FILE_A,
          importEntry: {
            type: 'singleImport',
            moduleSpecifier: './b',
            importName: 'c1',
            importAlias: 'c1',
            isTypeImport: false,
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_B,
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_C,
          },
        },
      ],
      barrelImportedBy: [
        {
          filePath: FILE_A,
          importEntry: {
            type: 'barrelImport',
            moduleSpecifier: './b',
            importAlias: 'b',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_B,
          },
        },
      ],
    },
  ],
  singleReexports: [],
  barrelReexports: [],
};

const EXPECTED_CYCLE_FILE_A: StrippedAnalyzedFileDetails = {
  hasEntryPoints: false,
  exports: [],
  fileType: 'code',
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  singleReexports: [
    {
      type: 'singleReexport',
      barrelImportedBy: [],
      exportName: 'a',
      importName: 'a',
      importedBy: [],
      isEntryPoint: false,
      isTypeReexport: false,
      moduleSpecifier: './cycle-b',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: CYCLE_FILE_B,
      rootModuleType: undefined,
    },
  ],
  barrelReexports: [],
};

const EXPECTED_CYCLE_FILE_B: StrippedAnalyzedFileDetails = {
  hasEntryPoints: false,
  exports: [],
  fileType: 'code',
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  singleReexports: [
    {
      type: 'singleReexport',
      barrelImportedBy: [],
      exportName: 'a',
      importName: 'a',
      importedBy: [],
      isEntryPoint: false,
      isTypeReexport: false,
      moduleSpecifier: './cycle-c',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: CYCLE_FILE_C,
      rootModuleType: undefined,
    },
  ],
  barrelReexports: [],
};

const EXPECTED_CYCLE_FILE_C: StrippedAnalyzedFileDetails = {
  hasEntryPoints: false,
  exports: [],
  fileType: 'code',
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  singleReexports: [
    {
      type: 'singleReexport',
      barrelImportedBy: [],
      exportName: 'a',
      importName: 'a',
      importedBy: [],
      isEntryPoint: false,
      isTypeReexport: false,
      moduleSpecifier: './cycle-a',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: CYCLE_FILE_A,
      rootModuleType: undefined,
    },
  ],
  barrelReexports: [],
};

const EXPECTED_FILE_D: StrippedAnalyzedFileDetails = {
  hasEntryPoints: false,
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
      importedBy: [
        {
          filePath: FILE_A,
          importEntry: {
            type: 'singleImport',
            moduleSpecifier: './e',
            importName: 'd1',
            importAlias: 'd1',
            isTypeImport: false,
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_E,
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_D,
          },
        },
      ],
      barrelImportedBy: [
        {
          filePath: FILE_A,
          importEntry: {
            type: 'barrelImport',
            moduleSpecifier: './b',
            importAlias: 'b',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_B,
          },
        },
      ],
    },
  ],
  singleReexports: [],
  barrelReexports: [],
};

const EXPECTED_FILE_E: StrippedAnalyzedFileDetails = {
  hasEntryPoints: false,
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
      importedBy: [],
      barrelImportedBy: [],
      rootModuleType: undefined,
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
      importedBy: [
        {
          filePath: FILE_A,
          importEntry: {
            type: 'singleImport',
            moduleSpecifier: './e',
            importName: 'f',
            importAlias: 'f',
            isTypeImport: false,
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_E,
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_E,
          },
        },
      ],
      barrelImportedBy: [],
    },
  ],
};

const EXPECTED_FILE_F: StrippedAnalyzedFileDetails = {
  hasEntryPoints: false,
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
      importedBy: [],
      barrelImportedBy: [],
      rootModuleType: 'builtin',
    },
    {
      type: 'singleReexport',
      barrelImportedBy: [],
      exportName: 'SourceCode',
      importName: 'SourceCode',
      importedBy: [],
      isEntryPoint: false,
      isTypeReexport: true,
      moduleSpecifier: 'eslint',
      resolvedModuleType: 'thirdParty',
      rootModuleType: 'thirdParty',
    },
  ],
  barrelReexports: [],
};

const EXPECTED_FILE_G: StrippedAnalyzedFileDetails = {
  hasEntryPoints: false,
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
      importedBy: [],
      barrelImportedBy: [],
    },
  ],
};

const EXPECTED_FILE_H: StrippedAnalyzedFileDetails = {
  fileType: 'other',
};

const EXPECTED = {
  [FILE_A]: EXPECTED_FILE_A,
  [FILE_B]: EXPECTED_FILE_B,
  [FILE_C]: EXPECTED_FILE_C,
  [FILE_D]: EXPECTED_FILE_D,
  [FILE_E]: EXPECTED_FILE_E,
  [FILE_F]: EXPECTED_FILE_F,
  [FILE_G]: EXPECTED_FILE_G,
  [FILE_H]: EXPECTED_FILE_H,
  [CYCLE_FILE_A]: EXPECTED_CYCLE_FILE_A,
  [CYCLE_FILE_B]: EXPECTED_CYCLE_FILE_B,
  [CYCLE_FILE_C]: EXPECTED_CYCLE_FILE_C,
};

it('Computes analyzed info', () => {
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
  expect(info).toMatchAnalyzedSpec(EXPECTED);
});
