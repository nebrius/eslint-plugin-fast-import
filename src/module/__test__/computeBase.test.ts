import { join } from 'path';
import { computeBase } from '../computeBase';

const TEST_PROJECT_DIR = join(__dirname, 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'b.ts');
const FILE_C = join(TEST_PROJECT_DIR, 'c.ts');

describe('computes base info', () => {
  it('does a thing', () => {
    const info = computeBase(TEST_PROJECT_DIR);
    expect(info).toEqual({
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
              importStatementRange: [0, 33],
              importSpecifierRange: [7, 21],
              moduleSpecifier: './a',
              importName: 'default',
              importAlias: 'defaultExport1',
              isTypeImport: false,
            },
            {
              type: 'barrelImport',
              filePath: FILE_B,
              importStatementRange: [34, 65],
              importSpecifierRange: [41, 53],
              moduleSpecifier: './a',
            },
            {
              type: 'singleImport',
              filePath: FILE_B,
              importStatementRange: [66, 91],
              importSpecifierRange: [75, 77],
              moduleSpecifier: './a',
              importName: 'a1',
              importAlias: 'a1',
              isTypeImport: false,
            },
            {
              type: 'singleImport',
              filePath: FILE_B,
              importStatementRange: [92, 128],
              importSpecifierRange: [101, 114],
              moduleSpecifier: './a',
              importName: 'a1',
              importAlias: 'a1Alias',
              isTypeImport: false,
            },
            {
              type: 'singleImport',
              filePath: FILE_B,
              importStatementRange: [129, 175],
              importSpecifierRange: [138, 161],
              moduleSpecifier: './a',
              importName: 'default',
              importAlias: 'defaultAlias',
              isTypeImport: false,
            },
            {
              type: 'singleImport',
              filePath: FILE_B,
              importStatementRange: [176, 223],
              importSpecifierRange: [185, 209],
              moduleSpecifier: './a',
              importName: 'a three',
              importAlias: 'stringAlias',
              isTypeImport: false,
            },
            {
              type: 'singleImport',
              filePath: FILE_B,
              importStatementRange: [224, 282],
              importSpecifierRange: [231, 245],
              moduleSpecifier: './a',
              importName: 'default',
              importAlias: 'defaultExport2',
              isTypeImport: false,
            },
            {
              type: 'singleImport',
              filePath: FILE_B,
              importStatementRange: [224, 282],
              importSpecifierRange: [249, 268],
              moduleSpecifier: './a',
              importName: 'a1',
              importAlias: 'a1WithDefault',
              isTypeImport: false,
            },
            {
              type: 'singleImport',
              filePath: FILE_B,
              importStatementRange: [283, 330],
              importSpecifierRange: [290, 304],
              moduleSpecifier: './a',
              importName: 'default',
              importAlias: 'defaultExport3',
              isTypeImport: false,
            },
            {
              type: 'barrelImport',
              filePath: FILE_B,
              importStatementRange: [283, 330],
              importSpecifierRange: [306, 318],
              moduleSpecifier: './a',
            },
            {
              type: 'dynamicImport',
              filePath: FILE_B,
              importStatementRange: [525, 541],
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
