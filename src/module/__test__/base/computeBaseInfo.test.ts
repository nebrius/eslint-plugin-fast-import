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
          fileType: 'code',
          imports: [],
          reexports: [],
        },
        [FILE_B]: {
          exports: [
            {
              exportName: 'default',
            },
          ],
          fileType: 'code',
          imports: [
            {
              importAlias: 'defaultExport1',
              importName: 'default',
              importType: 'single',
              isTypeImport: false,
              moduleSpecifier: './a',
            },
            {
              importType: 'barrel',
              moduleSpecifier: './a',
            },
            {
              importAlias: 'a1',
              importName: 'a1',
              importType: 'single',
              isTypeImport: false,
              moduleSpecifier: './a',
            },
            {
              importAlias: 'a1Alias',
              importName: 'a1',
              importType: 'single',
              isTypeImport: false,
              moduleSpecifier: './a',
            },
            {
              importAlias: 'defaultAlias',
              importName: 'default',
              importType: 'single',
              isTypeImport: false,
              moduleSpecifier: './a',
            },
            {
              importAlias: 'stringAlias',
              importName: 'a twelve',
              importType: 'single',
              isTypeImport: false,
              moduleSpecifier: './a',
            },
            {
              importAlias: 'defaultExport2',
              importName: 'default',
              importType: 'single',
              isTypeImport: false,
              moduleSpecifier: './a',
            },
            {
              importAlias: 'a1WithDefault',
              importName: 'a1',
              importType: 'single',
              isTypeImport: false,
              moduleSpecifier: './a',
            },
            {
              importAlias: 'defaultExport3',
              importName: 'default',
              importType: 'single',
              isTypeImport: false,
              moduleSpecifier: './a',
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
          reexports: [],
        },
        [FILE_C]: {
          exports: [
            {
              exportName: 'default',
            },
          ],
          fileType: 'code',
          imports: [],
          reexports: [
            {
              exportName: 'a1',
              importName: 'a1',
              isTypeReexport: false,
              moduleSpecifier: './a',
              reexportType: 'single',
            },
            {
              exportName: undefined,
              isTypeReexport: false,
              moduleSpecifier: './a',
              reexportType: 'barrel',
            },
            {
              exportName: 'c',
              isTypeReexport: false,
              moduleSpecifier: './a',
              reexportType: 'barrel',
            },
            {
              exportName: 'c1',
              importName: 'default',
              isTypeReexport: false,
              moduleSpecifier: './a',
              reexportType: 'single',
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
        },
        [FILE_D]: {
          exports: [
            {
              exportName: 'default',
            },
          ],
          fileType: 'code',
          imports: [],
          reexports: [],
        },
        [FILE_E]: {
          fileType: 'other',
        },
      },
      rootImportAlias: '@',
      sourceRoot: TEST_PROJECT_DIR,
    });
  });
});
