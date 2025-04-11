import { join } from 'path';
import {
  addBaseInfoForFile,
  computeBaseInfo,
  deleteBaseInfoForFile,
  updateBaseInfoForFile,
} from '../../../computeBaseInfo.js';
import type { StrippedBaseProjectInfo } from '../../../../__test__/util.js';
import { stripNodesFromBaseInfo } from '../../../../__test__/util.js';
import { getDirname } from 'cross-dirname';
import { parse } from '@typescript-eslint/typescript-estree';
import type { BaseImport, BaseReexport } from '../../../../types/base.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'b.ts');
const FILE_C = join(TEST_PROJECT_DIR, 'c.ts');
const FILE_D = join(TEST_PROJECT_DIR, 'd.ts');
const FILE_E = join(TEST_PROJECT_DIR, 'e.json');

const EXPECTED: StrippedBaseProjectInfo = {
  files: new Map([
    [
      FILE_A,
      {
        exports: [
          {
            exportName: 'Foo',
            isEntryPoint: false,
            isTypeExport: true,
          },
          {
            exportName: 'Bar',
            isEntryPoint: false,
            isTypeExport: true,
          },
          {
            exportName: 'a1',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a2',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a3',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a4',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a5',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a6',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'A7',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a8',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a9',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a10_1',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a10_2alias',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a10_rest',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a11_1',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a11_2',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a11_rest',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a twelve',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a13',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a14',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a15alias',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a16alias',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'default',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a18_1',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a18_2',
            isEntryPoint: false,
            isTypeExport: false,
          },
          {
            exportName: 'a18_3',
            isEntryPoint: false,
            isTypeExport: false,
          },
        ],
        fileType: 'code',
        imports: [],
        reexports: [],
      },
    ],
    [
      FILE_B,
      {
        exports: [
          {
            exportName: 'default',
            isEntryPoint: false,
            isTypeExport: false,
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
            importAlias: 'barrel1',
            importType: 'barrel',
            isTypeImport: false,
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
            importAlias: 'barrel2',
            importType: 'barrel',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            importAlias: 'e1',
            importName: 'e1',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: './e',
          },
          {
            importType: 'dynamic',
            moduleSpecifier: './a.js',
          },
        ],
        reexports: [],
      },
    ],
    [
      FILE_C,
      {
        exports: [
          {
            exportName: 'default',
            isEntryPoint: false,
            isTypeExport: false,
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
            isEntryPoint: false,
          },
          {
            exportName: undefined,
            isTypeReexport: false,
            moduleSpecifier: './a',
            reexportType: 'barrel',
            isEntryPoint: false,
          },
          {
            exportName: 'c',
            isTypeReexport: false,
            moduleSpecifier: './a',
            reexportType: 'barrel',
            isEntryPoint: false,
          },
          {
            exportName: 'c1',
            importName: 'default',
            isTypeReexport: false,
            moduleSpecifier: './a',
            reexportType: 'single',
            isEntryPoint: false,
          },
          {
            exportName: 'c2',
            importName: 'a1',
            isTypeReexport: false,
            moduleSpecifier: './a',
            reexportType: 'single',
            isEntryPoint: false,
          },
          {
            exportName: 'Foo',
            importName: 'Foo',
            isTypeReexport: true,
            moduleSpecifier: './a',
            reexportType: 'single',
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
            exportName: 'default',
            isEntryPoint: false,
            isTypeExport: false,
          },
        ],
        fileType: 'code',
        imports: [],
        reexports: [],
      },
    ],
    [
      FILE_E,
      {
        fileType: 'other',
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
    imports: [
      {
        importType: 'single',
        importAlias: 'a1',
        importName: 'a1',
        isTypeImport: false,
        moduleSpecifier: './a',
        // TODO: for some reason this type narrows to saying it should have only
        // two properties, which is clearly wrong
      } as Omit<BaseImport, 'statementNode' | 'reportNode'>,
    ],
    reexports: [],
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
    imports: [
      {
        importType: 'single',
        importAlias: 'a2',
        importName: 'a2',
        isTypeImport: false,
        moduleSpecifier: './a',
        // TODO: for some reason this type narrows to saying it should have only
        // two properties, which is clearly wrong
      } as Omit<BaseImport, 'statementNode' | 'reportNode'>,
      {
        importType: 'single',
        importAlias: 'a1',
        importName: 'a1',
        isTypeImport: false,
        moduleSpecifier: './a',
        // TODO: for some reason this type narrows to saying it should have only
        // two properties, which is clearly wrong
      } as Omit<BaseImport, 'statementNode' | 'reportNode'>,
    ],
    reexports: [
      {
        exportName: 'a1',
        importName: 'a1',
        isEntryPoint: false,
        isTypeReexport: false,
        moduleSpecifier: './a',
        reexportType: 'single',
        // TODO: for some reason this type narrows to saying it should have only
        // two properties, which is clearly wrong
      } as Omit<BaseReexport, 'statementNode' | 'reportNode'>,
    ],
    exports: [
      {
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
    imports: [
      {
        importType: 'single',
        importAlias: 'a1',
        importName: 'a1',
        isTypeImport: false,
        moduleSpecifier: './a',
        // TODO: for some reason this type narrows to saying it should have only
        // two properties, which is clearly wrong
      } as Omit<BaseImport, 'statementNode' | 'reportNode'>,
      {
        importType: 'single',
        importAlias: 'a2',
        importName: 'a2',
        isTypeImport: false,
        moduleSpecifier: './a',
        // TODO: for some reason this type narrows to saying it should have only
        // two properties, which is clearly wrong
      } as Omit<BaseImport, 'statementNode' | 'reportNode'>,
    ],
    reexports: [
      {
        exportName: 'a1',
        importName: 'a1',
        isEntryPoint: false,
        isTypeReexport: false,
        moduleSpecifier: './a',
        reexportType: 'single',
        // TODO: for some reason this type narrows to saying it should have only
        // two properties, which is clearly wrong
      } as Omit<BaseReexport, 'statementNode' | 'reportNode'>,
    ],
    exports: [
      {
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
