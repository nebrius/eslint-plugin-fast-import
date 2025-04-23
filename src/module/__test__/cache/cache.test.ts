import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from '@typescript-eslint/typescript-estree';
import { getDirname } from 'cross-dirname';

import type { StrippedAnalyzedFileDetails } from '../../../__test__/util.js';
import {
  getProjectInfo,
  initializeProject,
  updateCacheForFile,
  updateCacheFromFileSystem,
} from '../../module.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'b.ts');
const FILE_TS_NEW = join(TEST_PROJECT_DIR, 'new.ts');
const FILE_JSON_NEW = join(TEST_PROJECT_DIR, 'new.json');

const settings = {
  rootDir: TEST_PROJECT_DIR,
  wildcardAliases: {},
  fixedAliases: {},
  entryPoints: [],
  ignorePatterns: [],
  mode: 'fix' as const,
  editorUpdateRate: 5_000,
};

const EXPECTED_FILE_A: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  exports: [
    {
      type: 'export',
      exportName: 'One',
      isTypeExport: true,
      importedBy: [
        {
          filePath: FILE_B,
          importEntry: {
            type: 'singleImport',
            importAlias: 'One',
            importName: 'One',
            isTypeImport: true,
            moduleSpecifier: './a',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_A,
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_A,
          },
        },
      ],
      barrelImportedBy: [],
      isEntryPoint: false,
    },
  ],
  singleReexports: [],
  barrelReexports: [],
};

const EXPECTED_FILE_B: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  singleImports: [
    {
      type: 'singleImport',
      importAlias: 'One',
      importName: 'One',
      isTypeImport: true,
      moduleSpecifier: './a',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_A,
      rootModuleType: 'firstPartyCode',
      rootModulePath: FILE_A,
      rootExportEntry: {
        type: 'export',
        exportName: 'One',
        isTypeExport: true,
        isEntryPoint: false,
      },
    },
  ],
  barrelImports: [],
  dynamicImports: [],
  exports: [],
  singleReexports: [],
  barrelReexports: [],
};

const EXPECTED = {
  [FILE_A]: EXPECTED_FILE_A,
  [FILE_B]: EXPECTED_FILE_B,
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
  expect(projectInfo).toMatchAnalyzedSpec(EXPECTED);

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

  const EXPECTED_FILE_TS_NEW: StrippedAnalyzedFileDetails = {
    fileType: 'code',
    singleImports: [],
    barrelImports: [],
    dynamicImports: [],
    exports: [],
    singleReexports: [],
    barrelReexports: [],
  };

  projectInfo = getProjectInfo();
  expect(projectInfo).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_TS_NEW]: EXPECTED_FILE_TS_NEW,
  });
});

it('Updates cache when an unused export is added to an existing file', () => {
  initializeProject(settings);

  let projectInfo = getProjectInfo();
  expect(projectInfo).toMatchAnalyzedSpec(EXPECTED);

  const FILE_A_UPDATED_CONTENTS = `export type One = string;
export type Two = string;
`;

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

  const EXPECTED_FILE_A_UPDATED: StrippedAnalyzedFileDetails = {
    fileType: 'code',
    singleImports: [],
    barrelImports: [],
    dynamicImports: [],
    exports: [
      {
        type: 'export',
        barrelImportedBy: [],
        exportName: 'One',
        isTypeExport: true,
        importedBy: [
          {
            filePath: FILE_B,
            importEntry: {
              type: 'singleImport',
              importAlias: 'One',
              importName: 'One',
              isTypeImport: true,
              moduleSpecifier: './a',
              resolvedModuleType: 'firstPartyCode',
              resolvedModulePath: FILE_A,
              rootModuleType: 'firstPartyCode',
              rootModulePath: FILE_A,
            },
          },
        ],
        isEntryPoint: false,
      },
      {
        type: 'export',
        barrelImportedBy: [],
        exportName: 'Two',
        isTypeExport: true,
        importedBy: [],
        isEntryPoint: false,
      },
    ],
    singleReexports: [],
    barrelReexports: [],
  };
  const EXPECTED_FILE_B_UPDATED: StrippedAnalyzedFileDetails = {
    fileType: 'code',
    singleImports: [
      {
        type: 'singleImport',
        importAlias: 'One',
        importName: 'One',
        isTypeImport: true,
        moduleSpecifier: './a',
        resolvedModuleType: 'firstPartyCode',
        resolvedModulePath: FILE_A,
        rootModulePath: FILE_A,
        rootModuleType: 'firstPartyCode',
        rootExportEntry: {
          type: 'export',
          exportName: 'One',
          isTypeExport: true,
          isEntryPoint: false,
        },
      },
    ],
    barrelImports: [],
    dynamicImports: [],
    exports: [],
    singleReexports: [],
    barrelReexports: [],
  };
  expect(projectInfo).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A_UPDATED,
    [FILE_B]: EXPECTED_FILE_B_UPDATED,
  });
});

it('Updates cache in bulk for a code file', () => {
  initializeProject(settings);

  let projectInfo = getProjectInfo();
  expect(projectInfo).toMatchAnalyzedSpec(EXPECTED);

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
    [],
    settings,
    Date.now()
  );
  const EXPECTED_FILE_TS_NEW: StrippedAnalyzedFileDetails = {
    fileType: 'code',
    singleImports: [],
    barrelImports: [],
    dynamicImports: [],
    exports: [],
    singleReexports: [],
    barrelReexports: [],
  };
  projectInfo = getProjectInfo();
  expect(projectInfo).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_TS_NEW]: EXPECTED_FILE_TS_NEW,
  });

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
    [],
    settings,
    Date.now()
  );
  const EXPECTED_FILE_TS_NEW_UPDATED: StrippedAnalyzedFileDetails = {
    fileType: 'code',
    singleImports: [],
    barrelImports: [],
    dynamicImports: [],
    exports: [],
    singleReexports: [],
    barrelReexports: [],
  };
  projectInfo = getProjectInfo();
  expect(projectInfo).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_TS_NEW]: EXPECTED_FILE_TS_NEW_UPDATED,
  });

  // Modify the new file with invalid code (testing fallback to ensure project
  // info isn't changed in any way)
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
    [],
    settings,
    Date.now()
  );
  projectInfo = getProjectInfo();
  expect(projectInfo).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_TS_NEW]: EXPECTED_FILE_TS_NEW_UPDATED,
  });

  // Delete the file
  unlinkSync(FILE_TS_NEW);
  updateCacheFromFileSystem(
    {
      added: [],
      modified: [],
      deleted: [FILE_TS_NEW],
    },
    [],
    settings,
    Date.now()
  );
  projectInfo = getProjectInfo();
  expect(projectInfo).toMatchAnalyzedSpec(EXPECTED);
});

it('Updates cache in bulk for a non-code file', () => {
  initializeProject(settings);

  let projectInfo = getProjectInfo();
  expect(projectInfo).toMatchAnalyzedSpec(EXPECTED);

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
    [],
    settings,
    Date.now()
  );
  const EXPECTED_FILE_JSON_NEW: StrippedAnalyzedFileDetails = {
    fileType: 'other',
  };
  projectInfo = getProjectInfo();
  expect(projectInfo).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_JSON_NEW]: EXPECTED_FILE_JSON_NEW,
  });

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
    [],
    settings,
    Date.now()
  );
  const EXPECTED_FILE_JSON_NEW_UPDATED: StrippedAnalyzedFileDetails = {
    fileType: 'other',
  };
  projectInfo = getProjectInfo();
  expect(projectInfo).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_JSON_NEW]: EXPECTED_FILE_JSON_NEW_UPDATED,
  });

  // Delete the file
  unlinkSync(FILE_JSON_NEW);
  updateCacheFromFileSystem(
    {
      added: [],
      modified: [],
      deleted: [FILE_JSON_NEW],
    },
    [],
    settings,
    Date.now()
  );
  projectInfo = getProjectInfo();
  expect(projectInfo).toMatchAnalyzedSpec(EXPECTED);
});
