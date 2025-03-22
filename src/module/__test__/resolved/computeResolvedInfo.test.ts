import { join } from 'path';
import { stripNodes } from '../util';
import { computeResolvedInfo } from '../../computeResolvedInfo';
import { computeBaseInfo } from '../../computeBaseInfo';
import { getDirname } from 'cross-dirname';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'one', 'b.ts');
const FILE_C = join(TEST_PROJECT_DIR, 'one', 'c', 'index.ts');
const FILE_C_DATA = join(TEST_PROJECT_DIR, 'one', 'c', 'data.json');
const FILE_D = join(TEST_PROJECT_DIR, 'two', 'd.js');
const FILE_D_DECLARATION = join(TEST_PROJECT_DIR, 'two', 'd.d.ts');
const FILE_E = join(TEST_PROJECT_DIR, 'two', 'e.js');
const FILE_F = join(TEST_PROJECT_DIR, 'two', 'f', 'index.js');
const FILE_F_DECLARATION = join(TEST_PROJECT_DIR, 'two', 'f', 'index.d.ts');

it('Computes resolved into', () => {
  const info = computeResolvedInfo(
    computeBaseInfo({
      rootDir: TEST_PROJECT_DIR,
      rootImportAlias: '@',
      allowAliaslessRootImports: true,
      isEntryPointCheck: () => false,
    })
  );

  expect(stripNodes(info)).toEqual({
    allowAliaslessRootImports: true,
    files: {
      [FILE_A]: {
        exports: [],
        fileType: 'code',
        imports: [
          {
            importAlias: 'b1',
            importName: 'b1',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: '@/one/b',
            moduleType: 'firstPartyCode',
            resolvedModulePath: FILE_B,
          },
          {
            importAlias: 'c1',
            importName: 'c1',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: 'one/c',
            moduleType: 'firstPartyCode',
            resolvedModulePath: FILE_C,
          },
          {
            importAlias: 'data',
            importName: 'default',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: './one/c/data',
            moduleType: 'firstPartyOther',
            resolvedModulePath: FILE_C_DATA,
          },
          {
            importAlias: 'D2',
            importName: 'D2',
            importType: 'single',
            isTypeImport: true,
            moduleSpecifier: './two/d',
            moduleType: 'firstPartyCode',
            resolvedModulePath: FILE_D_DECLARATION,
          },
          {
            importAlias: 'getD1',
            importName: 'getD1',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: './two/d',
            moduleType: 'firstPartyCode',
            resolvedModulePath: FILE_D,
          },
          {
            importAlias: 'e1',
            importName: 'e1',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: './two/e',
            moduleType: 'firstPartyCode',
            resolvedModulePath: FILE_E,
          },
          {
            importAlias: 'F1',
            importName: 'F1',
            importType: 'single',
            isTypeImport: true,
            moduleSpecifier: './two/f',
            moduleType: 'firstPartyCode',
            resolvedModulePath: FILE_F_DECLARATION,
          },
          {
            importAlias: 'getF1',
            importName: 'getF1',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: './two/f',
            moduleType: 'firstPartyCode',
            resolvedModulePath: FILE_F,
          },
          {
            importAlias: 'join',
            importName: 'join',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: 'path',
            moduleType: 'builtin',
          },
          {
            importAlias: 'resolve',
            importName: 'resolve',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: 'node:path',
            moduleType: 'builtin',
          },
          {
            importAlias: 'parser',
            importName: 'parser',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: 'typescript-eslint',
            moduleType: 'thirdParty',
          },
        ],
        reexports: [],
      },
      [FILE_B]: {
        exports: [
          {
            exportName: 'b1',
            isEntryPoint: false,
          },
        ],
        fileType: 'code',
        imports: [],
        reexports: [],
      },
      [FILE_C]: {
        exports: [
          {
            exportName: 'c1',
            isEntryPoint: false,
          },
        ],
        fileType: 'code',
        imports: [],
        reexports: [],
      },
      [FILE_C_DATA]: {
        fileType: 'other',
      },
      [FILE_D]: {
        exports: [
          {
            exportName: 'getD1',
            isEntryPoint: false,
          },
        ],
        fileType: 'code',
        imports: [],
        reexports: [],
      },
      [FILE_D_DECLARATION]: {
        exports: [
          {
            exportName: 'getD1',
            isEntryPoint: false,
          },
          {
            exportName: 'D2',
            isEntryPoint: false,
          },
        ],
        fileType: 'code',
        imports: [],
        reexports: [],
      },
      [FILE_E]: {
        exports: [
          {
            exportName: 'e1',
            isEntryPoint: false,
          },
        ],
        fileType: 'code',
        imports: [],
        reexports: [],
      },
      [FILE_F]: {
        exports: [
          {
            exportName: 'getF1',
            isEntryPoint: false,
          },
        ],
        fileType: 'code',
        imports: [
          {
            importAlias: 'fake',
            importName: 'fake',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: './fake',
            moduleType: 'firstPartyOther',
            resolvedModulePath: undefined,
          },
        ],
        reexports: [],
      },
      [FILE_F_DECLARATION]: {
        exports: [
          {
            exportName: 'F1',
            isEntryPoint: false,
          },
          {
            exportName: 'getF1',
            isEntryPoint: false,
          },
        ],
        fileType: 'code',
        imports: [],
        reexports: [],
      },
    },
    rootImportAlias: '@',
    rootDir: TEST_PROJECT_DIR,
  });
});
