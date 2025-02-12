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
          exports: [],
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
              importName: 'a three',
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
          reexports: [],
          type: 'esm',
        },
      },
    });
  });
});
