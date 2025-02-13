import { join } from 'path';
import { computeBaseInfo } from '../computeBaseInfo';
import { stripNodes } from './util';

const TEST_PROJECT_DIR = join(__dirname, 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'b.ts');
const FILE_C = join(TEST_PROJECT_DIR, 'c.ts');

describe('computes base info', () => {
  it('does a thing', () => {
    const info = computeBaseInfo(TEST_PROJECT_DIR);
    expect(stripNodes(info)).toEqual({
      files: {
        [FILE_A]: {
          exports: [
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a1',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a2',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a3',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a4',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a5',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a6',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a10_1',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a10_2alias',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a10_rest',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a11_1',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a11_2',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a11_rest',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a twelve',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a13',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a14',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a15alias',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a16alias',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'default',
            },
            {
              exportName: 'a18_1',
              filePath: FILE_A,
              type: 'export',
            },
            {
              type: 'export',
              filePath: FILE_A,
              exportName: 'a18_2',
            },
            {
              exportName: 'a18_3',
              filePath: FILE_A,
              type: 'export',
            },
          ],
          imports: [],
          reexports: [],
          type: 'esm',
        },
        [FILE_B]: {
          type: 'esm',
          imports: [
            {
              type: 'singleImport',
              filePath: FILE_B,
              moduleSpecifier: './a',
              importName: 'default',
              importAlias: 'defaultExport1',
              isTypeImport: false,
            },
            {
              type: 'barrelImport',
              filePath: FILE_B,
              moduleSpecifier: './a',
            },
            {
              type: 'singleImport',
              filePath: FILE_B,
              moduleSpecifier: './a',
              importName: 'a1',
              importAlias: 'a1',
              isTypeImport: false,
            },
            {
              type: 'singleImport',
              filePath: FILE_B,
              moduleSpecifier: './a',
              importName: 'a1',
              importAlias: 'a1Alias',
              isTypeImport: false,
            },
            {
              type: 'singleImport',
              filePath: FILE_B,
              moduleSpecifier: './a',
              importName: 'default',
              importAlias: 'defaultAlias',
              isTypeImport: false,
            },
            {
              type: 'singleImport',
              filePath: FILE_B,
              moduleSpecifier: './a',
              importName: 'a twelve',
              importAlias: 'stringAlias',
              isTypeImport: false,
            },
            {
              type: 'singleImport',
              filePath: FILE_B,
              moduleSpecifier: './a',
              importName: 'default',
              importAlias: 'defaultExport2',
              isTypeImport: false,
            },
            {
              type: 'singleImport',
              filePath: FILE_B,
              moduleSpecifier: './a',
              importName: 'a1',
              importAlias: 'a1WithDefault',
              isTypeImport: false,
            },
            {
              type: 'singleImport',
              filePath: FILE_B,
              moduleSpecifier: './a',
              importName: 'default',
              importAlias: 'defaultExport3',
              isTypeImport: false,
            },
            {
              type: 'barrelImport',
              filePath: FILE_B,
              moduleSpecifier: './a',
            },
            {
              type: 'dynamicImport',
              filePath: FILE_B,
              moduleSpecifier: './a.js',
            },
          ],
          exports: [],
          reexports: [],
        },
        [FILE_C]: {
          exports: [],
          imports: [],
          reexports: [
            {
              type: 'singleReexport',
              filePath: FILE_C,
              moduleSpecifier: './a',
              importName: 'a1',
              exportName: 'a1',
              isTypeReexport: false,
            },
            {
              exportName: undefined,
              filePath: FILE_C,
              isTypeReexport: false,
              moduleSpecifier: './a',
              type: 'barrelReexport',
            },
            {
              type: 'barrelReexport',
              filePath: FILE_C,
              moduleSpecifier: './a',
              exportName: 'c',
              isTypeReexport: false,
            },
            {
              type: 'singleReexport',
              filePath: FILE_C,
              moduleSpecifier: './a',
              importName: 'default',
              exportName: 'c1',
              isTypeReexport: false,
            },
            {
              exportName: 'c2',
              filePath: FILE_C,
              importName: 'a1',
              isTypeReexport: false,
              moduleSpecifier: './a',
              type: 'singleReexport',
            },
            {
              exportName: 'Foo',
              filePath: FILE_C,
              importName: 'Foo',
              isTypeReexport: true,
              moduleSpecifier: './a',
              type: 'singleReexport',
            },
          ],
          type: 'esm',
        },
      },
    });
  });
});
