import { join } from 'node:path';

import { parse } from '@typescript-eslint/typescript-estree';
import { getDirname } from 'cross-dirname';

import type { StrippedBaseProjectInfo } from '../../../../__test__/util.js';
import { stripNodesFromBaseInfo } from '../../../../__test__/util.js';
import {
  addBaseInfoForFile,
  computeBaseInfo,
  deleteBaseInfoForFile,
  updateBaseInfoForFile,
} from '../../../computeBaseInfo.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'b.ts');
const FILE_C = join(TEST_PROJECT_DIR, 'c.ts');
const FILE_D = join(TEST_PROJECT_DIR, 'd.ts');
const FILE_E = join(TEST_PROJECT_DIR, 'e.json');

const EXPECTED: StrippedBaseProjectInfo = {
  files: new Map([
    [
      FILE_E,
      {
        fileType: 'other',
      },
    ],
    [
      FILE_A,
      {
        exports: [
          {
            id: 0,
            type: 'export',
            exportName: 'Foo',
            isEntryPoint: false,
            isTypeExport: true,
          },
          {
            id: 1,
            type: 'export',
            exportName: 'Bar',
            isEntryPoint: false,
            isTypeExport: true,
          },
          {
            id: 2,
            type: 'export',
            exportName: 'a1',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 3,
            type: 'export',
            exportName: 'a2',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 4,
            type: 'export',
            exportName: 'a3',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 5,
            type: 'export',
            exportName: 'a4',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 6,
            type: 'export',
            exportName: 'a5',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 7,
            type: 'export',
            exportName: 'a6',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 8,
            type: 'export',
            exportName: 'A7',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 9,
            type: 'export',
            exportName: 'a8',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 10,
            type: 'export',
            exportName: 'a9',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 11,
            type: 'export',
            exportName: 'a10_1',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 12,
            type: 'export',
            exportName: 'a10_2alias',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 13,
            type: 'export',
            exportName: 'a10_rest',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 14,
            type: 'export',
            exportName: 'a11_1',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 15,
            type: 'export',
            exportName: 'a11_2',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 16,
            type: 'export',
            exportName: 'a11_rest',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 17,
            type: 'export',
            exportName: 'a twelve',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 18,
            type: 'export',
            exportName: 'a13',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 19,
            type: 'export',
            exportName: 'a14',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 20,
            type: 'export',
            exportName: 'a15alias',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 21,
            type: 'export',
            exportName: 'a16alias',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 22,
            type: 'export',
            exportName: 'default',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 23,
            type: 'export',
            exportName: 'a18_1',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 24,
            type: 'export',
            exportName: 'a18_2',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            id: 25,
            type: 'export',
            exportName: 'a18_3',
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
      },
    ],
    [
      FILE_B,
      {
        exports: [
          {
            id: 38,
            type: 'export',
            exportName: 'default',
            isEntryPoint: false,
            isTypeExport: false,
          },
        ],
        fileType: 'code',
        singleImports: [
          {
            id: 26,
            type: 'singleImport',
            importAlias: 'defaultExport1',
            importName: 'default',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            id: 28,
            type: 'singleImport',
            importAlias: 'a1',
            importName: 'a1',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            id: 29,
            type: 'singleImport',
            importAlias: 'a1Alias',
            importName: 'a1',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            id: 30,
            type: 'singleImport',
            importAlias: 'defaultAlias',
            importName: 'default',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            id: 31,
            type: 'singleImport',
            importAlias: 'stringAlias',
            importName: 'a twelve',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            id: 32,
            type: 'singleImport',
            importAlias: 'defaultExport2',
            importName: 'default',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            id: 33,
            type: 'singleImport',
            importAlias: 'a1WithDefault',
            importName: 'a1',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            id: 34,
            type: 'singleImport',
            importAlias: 'defaultExport3',
            importName: 'default',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            id: 36,
            type: 'singleImport',
            importAlias: 'e1',
            importName: 'e1',
            isTypeImport: false,
            moduleSpecifier: './e',
          },
        ],
        barrelImports: [
          {
            id: 27,
            type: 'barrelImport',
            importAlias: 'barrel1',
            moduleSpecifier: './a',
          },
          {
            id: 35,
            type: 'barrelImport',
            importAlias: 'barrel2',
            moduleSpecifier: './a',
          },
        ],
        dynamicImports: [
          {
            id: 37,
            type: 'dynamicImport',
            moduleSpecifier: './a.js',
          },
        ],
        singleReexports: [],
        barrelReexports: [],
      },
    ],
    [
      FILE_C,
      {
        fileType: 'code',
        exports: [
          {
            id: 45,
            type: 'export',
            exportName: 'default',
            isEntryPoint: false,
            isTypeExport: false,
          },
        ],
        singleImports: [],
        barrelImports: [],
        dynamicImports: [],
        singleReexports: [
          {
            id: 39,
            type: 'singleReexport',
            exportName: 'a1',
            importName: 'a1',
            isTypeReexport: false,
            moduleSpecifier: './a',
            isEntryPoint: false,
          },
          {
            id: 42,
            type: 'singleReexport',
            exportName: 'c1',
            importName: 'default',
            isTypeReexport: false,
            moduleSpecifier: './a',
            isEntryPoint: false,
          },
          {
            id: 43,
            type: 'singleReexport',
            exportName: 'c2',
            importName: 'a1',
            isTypeReexport: false,
            moduleSpecifier: './a',
            isEntryPoint: false,
          },
          {
            id: 44,
            type: 'singleReexport',
            exportName: 'Foo',
            importName: 'Foo',
            isTypeReexport: true,
            moduleSpecifier: './a',
            isEntryPoint: false,
          },
        ],
        barrelReexports: [
          {
            id: 40,
            type: 'barrelReexport',
            exportName: undefined,
            moduleSpecifier: './a',
            isEntryPoint: false,
          },
          {
            id: 41,
            type: 'barrelReexport',
            exportName: 'c',
            moduleSpecifier: './a',
            isEntryPoint: false,
          },
        ],
      },
    ],
    [
      FILE_D,
      {
        exports: [
          {
            id: 46,
            type: 'export',
            exportName: 'default',
            isEntryPoint: false,
            isTypeExport: true,
          },
          {
            id: 47,
            type: 'export',
            exportName: 'MyNamespace',
            isEntryPoint: false,
            isTypeExport: true,
          },
          {
            id: 48,
            type: 'export',
            exportName: 'd',
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
      },
    ],
  ]),
  wildcardAliases: {},
  fixedAliases: {},
  rootDir: TEST_PROJECT_DIR,
  availableThirdPartyDependencies: new Map(),
};

it('Computes base info', () => {
  const info = computeBaseInfo({
    rootDir: TEST_PROJECT_DIR,
    wildcardAliases: {},
    fixedAliases: {},
    ignorePatterns: [],
    isEntryPointCheck: () => false,
  });
  expect(stripNodesFromBaseInfo(info)).toEqual(EXPECTED);
});

const NEW_FILE_PATH = join(TEST_PROJECT_DIR, 'newFile.ts');
const NEW_FILE_CONTENTS_ADD = `import { a1 } from './a'`;
const NEW_FILE_CONTENTS_MODIFY = `import { a2 } from './a';
import { a1 } from './a';
export { a1 } from './a';
export const newFile1 = 10;`;
const NEW_FILE_CONTENTS_MODIFY_2 = `import { a1 } from './a';
import { a2 } from './a';
export { a1 } from './a';
export const newFile1 = 10;`;

it('Adds, modifies, and deletes a new file', () => {
  const info = computeBaseInfo({
    rootDir: TEST_PROJECT_DIR,
    wildcardAliases: {},
    fixedAliases: {},
    ignorePatterns: [],
    isEntryPointCheck: () => false,
  });

  addBaseInfoForFile(
    {
      filePath: NEW_FILE_PATH,
      fileContents: NEW_FILE_CONTENTS_ADD,
      ast: parse(NEW_FILE_CONTENTS_ADD, {
        loc: true,
        range: true,
        tokens: true,
        jsx: true,
      }),
      isEntryPointCheck: () => false,
    },
    info
  );
  EXPECTED.files.set(NEW_FILE_PATH, {
    fileType: 'code',
    singleImports: [
      {
        id: 49,
        type: 'singleImport',
        importAlias: 'a1',
        importName: 'a1',
        isTypeImport: false,
        moduleSpecifier: './a',
      },
    ],
    barrelImports: [],
    dynamicImports: [],
    singleReexports: [],
    barrelReexports: [],
    exports: [],
  });
  expect(stripNodesFromBaseInfo(info)).toEqual(EXPECTED);

  updateBaseInfoForFile(
    {
      filePath: NEW_FILE_PATH,
      fileContents: NEW_FILE_CONTENTS_MODIFY,
      ast: parse(NEW_FILE_CONTENTS_MODIFY, {
        loc: true,
        range: true,
        tokens: true,
        jsx: true,
      }),
      isEntryPointCheck: () => false,
    },
    info
  );
  EXPECTED.files.set(NEW_FILE_PATH, {
    fileType: 'code',
    singleImports: [
      {
        id: 50,
        type: 'singleImport',
        importAlias: 'a2',
        importName: 'a2',
        isTypeImport: false,
        moduleSpecifier: './a',
      },
      {
        id: 51,
        type: 'singleImport',
        importAlias: 'a1',
        importName: 'a1',
        isTypeImport: false,
        moduleSpecifier: './a',
      },
    ],
    barrelImports: [],
    dynamicImports: [],
    singleReexports: [
      {
        id: 52,
        type: 'singleReexport',
        exportName: 'a1',
        importName: 'a1',
        isTypeReexport: false,
        moduleSpecifier: './a',
        isEntryPoint: false,
      },
    ],
    barrelReexports: [],
    exports: [
      {
        id: 53,
        type: 'export',
        exportName: 'newFile1',
        isEntryPoint: false,
        isTypeExport: false,
      },
    ],
  });
  expect(stripNodesFromBaseInfo(info)).toEqual(EXPECTED);
  updateBaseInfoForFile(
    {
      filePath: NEW_FILE_PATH,
      fileContents: NEW_FILE_CONTENTS_MODIFY_2,
      ast: parse(NEW_FILE_CONTENTS_MODIFY_2, {
        loc: true,
        range: true,
        tokens: true,
        jsx: true,
      }),
      isEntryPointCheck: () => false,
    },
    info
  );
  EXPECTED.files.set(NEW_FILE_PATH, {
    fileType: 'code',
    singleImports: [
      {
        id: 54,
        type: 'singleImport',
        importAlias: 'a1',
        importName: 'a1',
        isTypeImport: false,
        moduleSpecifier: './a',
      },
      {
        id: 55,
        type: 'singleImport',
        importAlias: 'a2',
        importName: 'a2',
        isTypeImport: false,
        moduleSpecifier: './a',
      },
    ],
    barrelImports: [],
    dynamicImports: [],
    singleReexports: [
      {
        id: 56,
        type: 'singleReexport',
        exportName: 'a1',
        importName: 'a1',
        isEntryPoint: false,
        isTypeReexport: false,
        moduleSpecifier: './a',
      },
    ],
    barrelReexports: [],
    exports: [
      {
        id: 57,
        type: 'export',
        exportName: 'newFile1',
        isEntryPoint: false,
        isTypeExport: false,
      },
    ],
  });
  expect(stripNodesFromBaseInfo(info)).toEqual(EXPECTED);

  deleteBaseInfoForFile(NEW_FILE_PATH, info);
  EXPECTED.files.delete(NEW_FILE_PATH);
  expect(stripNodesFromBaseInfo(info)).toEqual(EXPECTED);
});
