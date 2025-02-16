import { join } from 'path';
import { computeBaseInfo } from '../../computeBaseInfo';
import { stripNodes } from '../util';

const TEST_PROJECT_DIR = join(__dirname, 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'b.ts');
const FILE_C = join(TEST_PROJECT_DIR, 'c.ts');
const FILE_D = join(TEST_PROJECT_DIR, 'd.ts');
const FILE_E = join(TEST_PROJECT_DIR, 'e.json');

describe('computes base info', () => {
  it('does a thing', () => {
    const info = computeBaseInfo({
      sourceRoot: TEST_PROJECT_DIR,
      rootImportAlias: '@',
      allowAliaslessRootImports: false,
    });
    expect(stripNodes(info)).toEqual({
      rootImportAlias: '@',
      sourceRoot: TEST_PROJECT_DIR,
      allowAliaslessRootImports: false,
      files: {
        [FILE_A]: {
          exports: [
            {
              exportName: 'Foo',
            },
            {
              exportName: 'Bar',
            },
            {
              exportName: 'a1',
            },
            {
              exportName: 'a2',
            },
            {
              exportName: 'a3',
            },
            {
              exportName: 'a4',
            },
            {
              exportName: 'a5',
            },
            {
              exportName: 'a6',
            },
            {
              exportName: 'A7',
            },
            {
              exportName: 'a8',
            },
            {
              exportName: 'a9',
            },
            {
              exportName: 'a10_1',
            },
            {
              exportName: 'a10_2alias',
            },
            {
              exportName: 'a10_rest',
            },
            {
              exportName: 'a11_1',
            },
            {
              exportName: 'a11_2',
            },
            {
              exportName: 'a11_rest',
            },
            {
              exportName: 'a twelve',
            },
            {
              exportName: 'a13',
            },
            {
              exportName: 'a14',
            },
            {
              exportName: 'a15alias',
            },
            {
              exportName: 'a16alias',
            },
            {
              exportName: 'default',
            },
            {
              exportName: 'a18_1',
            },
            {
              exportName: 'a18_2',
            },
            {
              exportName: 'a18_3',
            },
          ],
          imports: [],
          reexports: [],
          fileType: 'code',
        },
        [FILE_B]: {
          fileType: 'code',
          imports: [
            {
              importType: 'single',
              moduleSpecifier: './a',
              importName: 'default',
              importAlias: 'defaultExport1',
              isTypeImport: false,
            },
            {
              importType: 'barrel',
              moduleSpecifier: './a',
            },
            {
              importType: 'single',
              moduleSpecifier: './a',
              importName: 'a1',
              importAlias: 'a1',
              isTypeImport: false,
            },
            {
              importType: 'single',
              moduleSpecifier: './a',
              importName: 'a1',
              importAlias: 'a1Alias',
              isTypeImport: false,
            },
            {
              importType: 'single',
              moduleSpecifier: './a',
              importName: 'default',
              importAlias: 'defaultAlias',
              isTypeImport: false,
            },
            {
              importType: 'single',
              moduleSpecifier: './a',
              importName: 'a twelve',
              importAlias: 'stringAlias',
              isTypeImport: false,
            },
            {
              importType: 'single',
              moduleSpecifier: './a',
              importName: 'default',
              importAlias: 'defaultExport2',
              isTypeImport: false,
            },
            {
              importType: 'single',
              moduleSpecifier: './a',
              importName: 'a1',
              importAlias: 'a1WithDefault',
              isTypeImport: false,
            },
            {
              importType: 'single',
              moduleSpecifier: './a',
              importName: 'default',
              importAlias: 'defaultExport3',
              isTypeImport: false,
            },
            {
              importType: 'barrel',
              moduleSpecifier: './a',
            },
            {
              importType: 'dynamic',
              moduleSpecifier: './a.js',
            },
          ],
          exports: [
            {
              exportName: 'default',
            },
          ],
          reexports: [],
        },
        [FILE_C]: {
          exports: [
            {
              exportName: 'default',
            },
          ],
          imports: [],
          reexports: [
            {
              reexportType: 'single',
              moduleSpecifier: './a',
              importName: 'a1',
              exportName: 'a1',
              isTypeReexport: false,
            },
            {
              exportName: undefined,
              isTypeReexport: false,
              moduleSpecifier: './a',
              reexportType: 'barrel',
            },
            {
              reexportType: 'barrel',
              moduleSpecifier: './a',
              exportName: 'c',
              isTypeReexport: false,
            },
            {
              reexportType: 'single',
              moduleSpecifier: './a',
              importName: 'default',
              exportName: 'c1',
              isTypeReexport: false,
            },
            {
              exportName: 'c2',
              importName: 'a1',
              isTypeReexport: false,
              moduleSpecifier: './a',
              reexportType: 'single',
            },
            {
              exportName: 'Foo',
              importName: 'Foo',
              isTypeReexport: true,
              moduleSpecifier: './a',
              reexportType: 'single',
            },
          ],
          fileType: 'code',
        },
        [FILE_D]: {
          exports: [
            {
              exportName: 'default',
            },
          ],
          imports: [],
          reexports: [],
          fileType: 'code',
        },
        [FILE_E]: {
          fileType: 'other',
        },
      },
    });
  });
});
