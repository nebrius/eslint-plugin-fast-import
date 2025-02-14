import { join } from 'path';
import { stripNodes } from '../util';
import { computeResolvedInfo } from '../../computeResolvedInfo';
import { computeBaseInfo } from '../../computeBaseInfo';

const TEST_PROJECT_DIR = join(__dirname, 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'one', 'b.ts');
const FILE_C = join(TEST_PROJECT_DIR, 'one', 'c', 'index.ts');
const FILE_C_DATA = join(TEST_PROJECT_DIR, 'one', 'c', 'data.json');
const FILE_D = join(TEST_PROJECT_DIR, 'two', 'd.js');
const FILE_D_DECLARATION = join(TEST_PROJECT_DIR, 'two', 'd.d.ts');
const FILE_E = join(TEST_PROJECT_DIR, 'two', 'e.js');
const FILE_F = join(TEST_PROJECT_DIR, 'two', 'f', 'index.js');
const FILE_F_DECLARATION = join(TEST_PROJECT_DIR, 'two', 'f', 'index.d.ts');

describe('computes base info', () => {
  it('does a thing', () => {
    const info = computeResolvedInfo(
      computeBaseInfo({
        sourceRoot: TEST_PROJECT_DIR,
        rootImportAlias: '@',
        allowAliaslessRootImports: true,
      })
    );

    expect(stripNodes(info)).toEqual({
      sourceRoot: TEST_PROJECT_DIR,
      rootImportAlias: '@',
      allowAliaslessRootImports: true,
      files: {
        [FILE_A]: {
          type: 'esm',
          imports: [
            {
              type: 'singleImport',
              filePath: FILE_A,
              moduleSpecifier: './one/b',
              importName: 'b1',
              importAlias: 'b1',
              isTypeImport: false,
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_B,
            },
            {
              filePath: FILE_A,
              importAlias: 'c1',
              importName: 'c1',
              isTypeImport: false,
              moduleSpecifier: './one/c',
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_C,
              type: 'singleImport',
            },
            {
              filePath: FILE_A,
              importAlias: 'data',
              importName: 'default',
              isTypeImport: false,
              moduleSpecifier: './one/c/data',
              moduleType: 'firstPartyOther',
              resolvedModulePath: FILE_C_DATA,
              type: 'singleImport',
            },
            {
              type: 'singleImport',
              filePath: FILE_A,
              moduleSpecifier: './two/d',
              importName: 'D2',
              importAlias: 'D2',
              isTypeImport: true,
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_D_DECLARATION,
            },
            {
              type: 'singleImport',
              filePath: FILE_A,
              moduleSpecifier: './two/d',
              importName: 'getD1',
              importAlias: 'getD1',
              isTypeImport: false,
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_D,
            },
            {
              type: 'singleImport',
              filePath: FILE_A,
              moduleSpecifier: './two/e',
              importName: 'e1',
              importAlias: 'e1',
              isTypeImport: false,
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_E,
            },
            {
              type: 'singleImport',
              filePath: FILE_A,
              moduleSpecifier: './two/f',
              importName: 'F1',
              importAlias: 'F1',
              isTypeImport: true,
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_F_DECLARATION,
            },
            {
              type: 'singleImport',
              filePath: FILE_A,
              moduleSpecifier: './two/f',
              importName: 'getF1',
              importAlias: 'getF1',
              isTypeImport: false,
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_F,
            },
            {
              filePath: FILE_A,
              importAlias: 'join',
              importName: 'join',
              isTypeImport: false,
              moduleSpecifier: 'path',
              moduleType: 'builtin',
              type: 'singleImport',
            },
            {
              filePath: FILE_A,
              importAlias: 'resolve',
              importName: 'resolve',
              isTypeImport: false,
              moduleSpecifier: 'node:path',
              moduleType: 'builtin',
              type: 'singleImport',
            },
            {
              filePath: FILE_A,
              importAlias: 'parser',
              importName: 'parser',
              isTypeImport: false,
              moduleSpecifier: 'typescript-eslint',
              moduleType: 'thirdParty',
              type: 'singleImport',
            },
          ],
          exports: [],
          reexports: [],
        },
        [FILE_B]: {
          type: 'esm',
          imports: [],
          exports: [
            {
              type: 'export',
              filePath: FILE_B,
              exportName: 'b1',
            },
          ],
          reexports: [],
        },
        [FILE_C]: {
          type: 'esm',
          imports: [],
          exports: [
            {
              exportName: 'c1',
              filePath: FILE_C,
              type: 'export',
            },
          ],
          reexports: [],
        },
        [FILE_C_DATA]: {
          type: 'other',
        },
        [FILE_D_DECLARATION]: {
          type: 'esm',
          imports: [],
          exports: [
            {
              type: 'export',
              filePath: FILE_D_DECLARATION,
              exportName: 'getD1',
            },
            {
              type: 'export',
              filePath: FILE_D_DECLARATION,
              exportName: 'D2',
            },
          ],
          reexports: [],
        },
        [FILE_D]: {
          type: 'esm',
          imports: [],
          exports: [
            {
              type: 'export',
              filePath: FILE_D,
              exportName: 'getD1',
            },
          ],
          reexports: [],
        },
        [FILE_E]: {
          type: 'esm',
          imports: [],
          exports: [
            {
              type: 'export',
              filePath: FILE_E,
              exportName: 'e1',
            },
          ],
          reexports: [],
        },
        [FILE_F_DECLARATION]: {
          type: 'esm',
          imports: [],
          exports: [
            {
              type: 'export',
              filePath: FILE_F_DECLARATION,
              exportName: 'F1',
            },
            {
              type: 'export',
              filePath: FILE_F_DECLARATION,
              exportName: 'getF1',
            },
          ],
          reexports: [],
        },
        [FILE_F]: {
          type: 'esm',
          imports: [],
          exports: [
            {
              type: 'export',
              filePath: FILE_F,
              exportName: 'getF1',
            },
          ],
          reexports: [],
        },
      },
    });
  });
});
