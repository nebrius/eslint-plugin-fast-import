import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import type { StrippedResolvedFileDetails } from '../../../../__test__/util.js';
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

const EXPECTED_FILE_A: StrippedResolvedFileDetails = {
  exports: [],
  fileType: 'code',
  singleImports: [
    {
      type: 'singleImport',
      importAlias: 'b1',
      importName: 'b1',
      isTypeImport: false,
      moduleSpecifier: '@/one/b',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_B,
    },
    {
      type: 'singleImport',
      importAlias: 'data',
      importName: 'default',
      isTypeImport: false,
      moduleSpecifier: './one/c/data',
      resolvedModuleType: 'firstPartyOther',
      resolvedModulePath: FILE_C_DATA,
    },
    {
      type: 'singleImport',
      importAlias: 'D2',
      importName: 'D2',
      isTypeImport: true,
      moduleSpecifier: './two/d',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_D_DECLARATION,
    },
    {
      type: 'singleImport',
      importAlias: 'getD1',
      importName: 'getD1',
      isTypeImport: false,
      moduleSpecifier: './two/d',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_D,
    },
    {
      type: 'singleImport',
      importAlias: 'e1',
      importName: 'e1',
      isTypeImport: false,
      moduleSpecifier: './two/e',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_E,
    },
    {
      type: 'singleImport',
      importAlias: 'F1',
      importName: 'F1',
      isTypeImport: true,
      moduleSpecifier: './two/f',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_F_DECLARATION,
    },
    {
      type: 'singleImport',
      importAlias: 'getF1',
      importName: 'getF1',
      isTypeImport: false,
      moduleSpecifier: './two/f',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_F,
    },
    {
      type: 'singleImport',
      importAlias: 'join',
      importName: 'join',
      isTypeImport: false,
      moduleSpecifier: 'path',
      resolvedModuleType: 'builtin',
    },
    {
      type: 'singleImport',
      importAlias: 'resolve',
      importName: 'resolve',
      isTypeImport: false,
      moduleSpecifier: 'node:path',
      resolvedModuleType: 'builtin',
    },
    {
      type: 'singleImport',
      importAlias: 'parser',
      importName: 'parser',
      isTypeImport: false,
      moduleSpecifier: 'typescript-eslint',
      resolvedModuleType: 'thirdParty',
    },
    {
      type: 'singleImport',
      importAlias: 'index',
      importName: 'index',
      isTypeImport: false,
      moduleSpecifier: '.',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_INDEX,
    },
    {
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
};

const EXPECTED_FILE_INDEX: StrippedResolvedFileDetails = {
  exports: [
    {
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
};

const EXPECTED_FILE_B: StrippedResolvedFileDetails = {
  exports: [
    {
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
};

const EXPECTED_FILE_C: StrippedResolvedFileDetails = {
  fileType: 'code',
  exports: [
    {
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
};

const EXPECTED_FILE_C_DATA: StrippedResolvedFileDetails = {
  fileType: 'other',
};

const EXPECTED_FILE_D_DECLARATION: StrippedResolvedFileDetails = {
  exports: [
    {
      type: 'export',
      exportName: 'getD1',
      isEntryPoint: false,
      isTypeExport: false,
    },
    {
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
};

const EXPECTED_FILE_D: StrippedResolvedFileDetails = {
  exports: [
    {
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
};

const EXPECTED_FILE_E: StrippedResolvedFileDetails = {
  fileType: 'code',
  exports: [
    {
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
};

const EXPECTED_FILE_F_DECLARATION: StrippedResolvedFileDetails = {
  exports: [
    {
      type: 'export',
      exportName: 'F1',
      isEntryPoint: false,
      isTypeExport: true,
    },
    {
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
};

const EXPECTED_FILE_F: StrippedResolvedFileDetails = {
  fileType: 'code',
  exports: [
    {
      type: 'export',
      exportName: 'getF1',
      isEntryPoint: false,
      isTypeExport: false,
    },
  ],
  singleImports: [
    {
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
};

const EXPECTED = {
  [FILE_A]: EXPECTED_FILE_A,
  [FILE_INDEX]: EXPECTED_FILE_INDEX,
  [FILE_B]: EXPECTED_FILE_B,
  [FILE_C]: EXPECTED_FILE_C,
  [FILE_C_DATA]: EXPECTED_FILE_C_DATA,
  [FILE_D_DECLARATION]: EXPECTED_FILE_D_DECLARATION,
  [FILE_D]: EXPECTED_FILE_D,
  [FILE_E]: EXPECTED_FILE_E,
  [FILE_F_DECLARATION]: EXPECTED_FILE_F_DECLARATION,
  [FILE_F]: EXPECTED_FILE_F,
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

  expect(info).toMatchResolvedSpec(EXPECTED);
});
