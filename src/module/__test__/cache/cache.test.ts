import { getDirname } from 'cross-dirname';
import { join } from 'node:path';
import {
  getProjectInfo,
  initializeProject,
  updateCacheForFile,
  updateCacheFromFileSystem,
} from '../../module.js';
import type { StrippedAnalyzedProjectInfo } from '../../../__test__/util.js';
import { stripNodesFromAnalyzedInfo } from '../../../__test__/util.js';
import { parse } from '@typescript-eslint/typescript-estree';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'b.ts');
const FILE_TS_NEW = join(TEST_PROJECT_DIR, 'new.ts');
const FILE_JSON_NEW = join(TEST_PROJECT_DIR, 'new.json');

const FILE_A_UPDATED_CONTENTS = `export type One = string;
export type Two = string;
`;

const settings = {
  rootDir: TEST_PROJECT_DIR,
  wildcardAliases: {},
  fixedAliases: {},
  entryPoints: [],
  ignorePatterns: [],
  mode: 'fix' as const,
  editorUpdateRate: 5_000,
};

const baseExpected: StrippedAnalyzedProjectInfo = {
  files: new Map([
    [
      FILE_A,
      {
        fileType: 'code',
        imports: [],
        exports: [
          {
            barrelImportedByFiles: [],
            exportName: 'One',
            isTypeExport: true,
            importedByFiles: [FILE_B],
            isEntryPoint: false,
            reexportedByFiles: [],
          },
        ],
        reexports: [],
      },
    ],
    [
      FILE_B,
      {
        fileType: 'code',
        imports: [
          {
            importAlias: 'One',
            importName: 'One',
            importType: 'single',
            isTypeImport: true,
            moduleSpecifier: './a',
            moduleType: 'firstPartyCode',
            resolvedModulePath: FILE_A,
            rootExportName: 'One',
            rootExportType: 'export',
            rootModulePath: FILE_A,
            rootModuleType: 'firstPartyCode',
          },
        ],
        exports: [],
        reexports: [],
      },
    ],
  ]),
  rootDir: TEST_PROJECT_DIR,
  wildcardAliases: {},
  fixedAliases: {},
  availableThirdPartyDependencies: new Map(),
};

afterEach(() => {
  if (existsSync(FILE_TS_NEW)) {
    unlinkSync(FILE_TS_NEW);
  }
  if (existsSync(FILE_JSON_NEW)) {
    unlinkSync(FILE_JSON_NEW);
  }
});

it('Updates cache when a new file is added', () => {
  initializeProject(settings);

  let projectInfo = getProjectInfo();
  expect(stripNodesFromAnalyzedInfo(projectInfo)).toEqual(baseExpected);

  updateCacheForFile(
    FILE_TS_NEW,
    '',
    parse('', {
      loc: true,
      range: true,
      tokens: true,
      jsx: true,
    }),
    settings
  );

  const expected2: StrippedAnalyzedProjectInfo = {
    files: new Map([
      // Will always be true, and even if not will cause the test to fail anyways
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      [FILE_A, baseExpected.files.get(FILE_A)!],
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      [FILE_B, baseExpected.files.get(FILE_B)!],
      [
        FILE_TS_NEW,
        {
          fileType: 'code',
          imports: [],
          exports: [],
          reexports: [],
        },
      ],
    ]),
    rootDir: TEST_PROJECT_DIR,
    wildcardAliases: {},
    fixedAliases: {},
    availableThirdPartyDependencies: new Map(),
  };
  projectInfo = getProjectInfo();
  expect(stripNodesFromAnalyzedInfo(projectInfo)).toEqual(expected2);
});

it('Updates cache when an unused export is added to an existing file', () => {
  initializeProject(settings);

  let projectInfo = getProjectInfo();
  expect(stripNodesFromAnalyzedInfo(projectInfo)).toEqual(baseExpected);

  updateCacheForFile(
    FILE_A,
    FILE_A_UPDATED_CONTENTS,
    parse(FILE_A_UPDATED_CONTENTS, {
      loc: true,
      range: true,
      tokens: true,
      jsx: true,
    }),
    settings
  );

  projectInfo = getProjectInfo();
  const expected2: StrippedAnalyzedProjectInfo = {
    files: new Map([
      [
        FILE_A,
        {
          fileType: 'code',
          imports: [],
          exports: [
            {
              barrelImportedByFiles: [],
              exportName: 'One',
              isTypeExport: true,
              importedByFiles: [FILE_B],
              isEntryPoint: false,
              reexportedByFiles: [],
            },
            {
              barrelImportedByFiles: [],
              exportName: 'Two',
              isTypeExport: true,
              importedByFiles: [],
              isEntryPoint: false,
              reexportedByFiles: [],
            },
          ],
          reexports: [],
        },
      ],
      [
        FILE_B,
        {
          fileType: 'code',
          imports: [
            {
              importAlias: 'One',
              importName: 'One',
              importType: 'single',
              isTypeImport: true,
              moduleSpecifier: './a',
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_A,
              rootExportName: 'One',
              rootExportType: 'export',
              rootModulePath: FILE_A,
              rootModuleType: 'firstPartyCode',
            },
          ],
          exports: [],
          reexports: [],
        },
      ],
    ]),
    rootDir: TEST_PROJECT_DIR,
    wildcardAliases: {},
    fixedAliases: {},
    availableThirdPartyDependencies: new Map(),
  };
  expect(stripNodesFromAnalyzedInfo(projectInfo)).toEqual(expected2);
});

it('Updates cache in bulk for a code file', () => {
  initializeProject(settings);

  let projectInfo = getProjectInfo();
  expect(stripNodesFromAnalyzedInfo(projectInfo)).toEqual(baseExpected);

  // Add a new file
  writeFileSync(FILE_TS_NEW, '');
  updateCacheFromFileSystem(
    {
      added: [
        {
          filePath: FILE_TS_NEW,
          latestUpdatedAt: Date.now(),
        },
      ],
      modified: [],
      deleted: [],
    },
    settings,
    Date.now()
  );
  const expected2: StrippedAnalyzedProjectInfo = {
    ...baseExpected,
    files: new Map([
      ...baseExpected.files,
      [
        FILE_TS_NEW,
        {
          fileType: 'code',
          imports: [],
          exports: [],
          reexports: [],
        },
      ],
    ]),
  };
  projectInfo = getProjectInfo();
  expect(stripNodesFromAnalyzedInfo(projectInfo)).toEqual(expected2);

  // Modify the new new file
  writeFileSync(FILE_TS_NEW, `console.log()`);
  updateCacheFromFileSystem(
    {
      added: [],
      modified: [
        {
          filePath: FILE_TS_NEW,
          latestUpdatedAt: Date.now(),
        },
      ],
      deleted: [],
    },
    settings,
    Date.now()
  );
  const expected3: StrippedAnalyzedProjectInfo = {
    ...baseExpected,
    files: new Map([
      ...baseExpected.files,
      [
        FILE_TS_NEW,
        {
          fileType: 'code',
          imports: [],
          exports: [],
          reexports: [],
        },
      ],
    ]),
  };
  projectInfo = getProjectInfo();
  expect(stripNodesFromAnalyzedInfo(projectInfo)).toEqual(expected3);

  // Modify the new file with invalid code (testing fallback)
  writeFileSync(FILE_TS_NEW, `+_)(*&^%$%)`);
  updateCacheFromFileSystem(
    {
      added: [],
      modified: [
        {
          filePath: FILE_TS_NEW,
          latestUpdatedAt: Date.now(),
        },
      ],
      deleted: [],
    },
    settings,
    Date.now()
  );
  projectInfo = getProjectInfo();
  expect(stripNodesFromAnalyzedInfo(projectInfo)).toEqual(expected3);

  // Delete the file
  unlinkSync(FILE_TS_NEW);
  updateCacheFromFileSystem(
    {
      added: [],
      modified: [],
      deleted: [FILE_TS_NEW],
    },
    settings,
    Date.now()
  );
  projectInfo = getProjectInfo();
  expect(stripNodesFromAnalyzedInfo(projectInfo)).toEqual(baseExpected);
});

it('Updates cache in bulk for a non-code file', () => {
  initializeProject(settings);

  let projectInfo = getProjectInfo();
  expect(stripNodesFromAnalyzedInfo(projectInfo)).toEqual(baseExpected);

  // Add a new file
  writeFileSync(FILE_JSON_NEW, '{}');
  updateCacheFromFileSystem(
    {
      added: [
        {
          filePath: FILE_JSON_NEW,
          latestUpdatedAt: Date.now(),
        },
      ],
      modified: [],
      deleted: [],
    },
    settings,
    Date.now()
  );
  const expected2: StrippedAnalyzedProjectInfo = {
    ...baseExpected,
    files: new Map([
      ...baseExpected.files,
      [
        FILE_JSON_NEW,
        {
          fileType: 'other',
        },
      ],
    ]),
  };
  projectInfo = getProjectInfo();
  expect(stripNodesFromAnalyzedInfo(projectInfo)).toEqual(expected2);

  // Modify the new new file
  writeFileSync(FILE_JSON_NEW, `{ "foo": 10 }`);
  updateCacheFromFileSystem(
    {
      added: [],
      modified: [
        {
          filePath: FILE_JSON_NEW,
          latestUpdatedAt: Date.now(),
        },
      ],
      deleted: [],
    },
    settings,
    Date.now()
  );
  const expected3: StrippedAnalyzedProjectInfo = {
    ...baseExpected,
    files: new Map([
      ...baseExpected.files,
      [
        FILE_JSON_NEW,
        {
          fileType: 'other',
        },
      ],
    ]),
  };
  projectInfo = getProjectInfo();
  expect(stripNodesFromAnalyzedInfo(projectInfo)).toEqual(expected3);

  // Delete the file
  unlinkSync(FILE_JSON_NEW);
  updateCacheFromFileSystem(
    {
      added: [],
      modified: [],
      deleted: [FILE_JSON_NEW],
    },
    settings,
    Date.now()
  );
  projectInfo = getProjectInfo();
  expect(stripNodesFromAnalyzedInfo(projectInfo)).toEqual(baseExpected);
});
