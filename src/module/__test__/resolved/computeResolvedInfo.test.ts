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
          fileType: 'code',
          imports: [
            {
              importType: 'single',
              moduleSpecifier: '@/one/b',
              importName: 'b1',
              importAlias: 'b1',
              isTypeImport: false,
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_B,
            },
            {
              importAlias: 'c1',
              importName: 'c1',
              isTypeImport: false,
              moduleSpecifier: 'one/c',
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_C,
              importType: 'single',
            },
            {
              importAlias: 'data',
              importName: 'default',
              isTypeImport: false,
              moduleSpecifier: './one/c/data',
              moduleType: 'firstPartyOther',
              resolvedModulePath: FILE_C_DATA,
              importType: 'single',
            },
            {
              importType: 'single',
              moduleSpecifier: './two/d',
              importName: 'D2',
              importAlias: 'D2',
              isTypeImport: true,
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_D_DECLARATION,
            },
            {
              importType: 'single',
              moduleSpecifier: './two/d',
              importName: 'getD1',
              importAlias: 'getD1',
              isTypeImport: false,
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_D,
            },
            {
              importType: 'single',
              moduleSpecifier: './two/e',
              importName: 'e1',
              importAlias: 'e1',
              isTypeImport: false,
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_E,
            },
            {
              importType: 'single',
              moduleSpecifier: './two/f',
              importName: 'F1',
              importAlias: 'F1',
              isTypeImport: true,
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_F_DECLARATION,
            },
            {
              importType: 'single',
              moduleSpecifier: './two/f',
              importName: 'getF1',
              importAlias: 'getF1',
              isTypeImport: false,
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_F,
            },
            {
              importAlias: 'join',
              importName: 'join',
              isTypeImport: false,
              moduleSpecifier: 'path',
              moduleType: 'builtin',
              importType: 'single',
            },
            {
              importAlias: 'resolve',
              importName: 'resolve',
              isTypeImport: false,
              moduleSpecifier: 'node:path',
              moduleType: 'builtin',
              importType: 'single',
            },
            {
              importAlias: 'parser',
              importName: 'parser',
              isTypeImport: false,
              moduleSpecifier: 'typescript-eslint',
              moduleType: 'thirdParty',
              importType: 'single',
            },
          ],
          exports: [],
          reexports: [],
        },
        [FILE_B]: {
          fileType: 'code',
          imports: [],
          exports: [
            {
              exportName: 'b1',
            },
          ],
          reexports: [],
        },
        [FILE_C]: {
          fileType: 'code',
          imports: [],
          exports: [
            {
              exportName: 'c1',
            },
          ],
          reexports: [],
        },
        [FILE_C_DATA]: {
          fileType: 'other',
        },
        [FILE_D_DECLARATION]: {
          fileType: 'code',
          imports: [],
          exports: [
            {
              exportName: 'getD1',
            },
            {
              exportName: 'D2',
            },
          ],
          reexports: [],
        },
        [FILE_D]: {
          fileType: 'code',
          imports: [],
          exports: [
            {
              exportName: 'getD1',
            },
          ],
          reexports: [],
        },
        [FILE_E]: {
          fileType: 'code',
          imports: [],
          exports: [
            {
              exportName: 'e1',
            },
          ],
          reexports: [],
        },
        [FILE_F_DECLARATION]: {
          fileType: 'code',
          imports: [],
          exports: [
            {
              exportName: 'F1',
            },
            {
              exportName: 'getF1',
            },
          ],
          reexports: [],
        },
        [FILE_F]: {
          fileType: 'code',
          imports: [],
          exports: [
            {
              exportName: 'getF1',
            },
          ],
          reexports: [],
        },
      },
    });
  });
});
