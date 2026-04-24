import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from '@typescript-eslint/typescript-estree';
import { getDirname } from 'cross-dirname';

import type { StrippedAnalyzedFileDetails } from '../../../__test__/util.js';
import type { ParsedPackageSettings } from '../../../settings/settings.js';
import {
  getProjectInfo,
  initializeProject,
  updateCacheForFile,
  updateCacheFromFileSystem,
} from '../../module.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project', 'singlerepo');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'b.ts');
const FILE_TS_NEW = join(TEST_PROJECT_DIR, 'new.ts');
const FILE_JSON_NEW = join(TEST_PROJECT_DIR, 'new.json');

const packageSettings: ParsedPackageSettings = {
  repoRootDir: TEST_PROJECT_DIR,
  packageRootDir: TEST_PROJECT_DIR,
  packageName: 'singlerepo',
  wildcardAliases: {},
  fixedAliases: {},
  entryPoints: [],
  externallyImported: [],
  ignorePatterns: [],
  ignoreOverridePatterns: [],
  testFilePatterns: [],
};

const EXPECTED_FILE_A: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  entryPointSpecifier: undefined,
  isExternallyImported: false,
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
      externallyImportedBy: [],
      isEntryPoint: false,
      isExternallyImported: false,
    },
  ],
  singleReexports: [],
  barrelReexports: [],
};

const EXPECTED_FILE_B: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  entryPointSpecifier: undefined,
  isExternallyImported: false,
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
        isExternallyImported: false,
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

it('Updates project cache when a new file is added', () => {
  initializeProject(packageSettings);

  let projectInfo = getProjectInfo(TEST_PROJECT_DIR);
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
    packageSettings
  );

  const EXPECTED_FILE_TS_NEW: StrippedAnalyzedFileDetails = {
    fileType: 'code',
    entryPointSpecifier: undefined,
    isExternallyImported: false,
    singleImports: [],
    barrelImports: [],
    dynamicImports: [],
    exports: [],
    singleReexports: [],
    barrelReexports: [],
  };

  projectInfo = getProjectInfo(TEST_PROJECT_DIR);
  expect(projectInfo).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_TS_NEW]: EXPECTED_FILE_TS_NEW,
  });
});

it('Updates project cache when an unused export is added to an existing file', () => {
  initializeProject(packageSettings);

  let projectInfo = getProjectInfo(TEST_PROJECT_DIR);
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
    packageSettings
  );

  projectInfo = getProjectInfo(TEST_PROJECT_DIR);

  const EXPECTED_FILE_A_UPDATED: StrippedAnalyzedFileDetails = {
    fileType: 'code',
    entryPointSpecifier: undefined,
    isExternallyImported: false,
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
        externallyImportedBy: [],
        isEntryPoint: false,
        isExternallyImported: false,
      },
      {
        type: 'export',
        exportName: 'Two',
        isTypeExport: true,
        importedBy: [],
        barrelImportedBy: [],
        externallyImportedBy: [],
        isEntryPoint: false,
        isExternallyImported: false,
      },
    ],
    singleReexports: [],
    barrelReexports: [],
  };
  const EXPECTED_FILE_B_UPDATED: StrippedAnalyzedFileDetails = {
    fileType: 'code',
    entryPointSpecifier: undefined,
    isExternallyImported: false,
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
          isExternallyImported: false,
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

it('Updates project cache in bulk for a code file', () => {
  initializeProject(packageSettings);

  let projectInfo = getProjectInfo(TEST_PROJECT_DIR);
  expect(projectInfo).toMatchAnalyzedSpec(EXPECTED);

  // Add a new file
  writeFileSync(FILE_TS_NEW, '');
  updateCacheFromFileSystem(
    packageSettings.packageRootDir,
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
    packageSettings,
    Date.now()
  );
  const EXPECTED_FILE_TS_NEW: StrippedAnalyzedFileDetails = {
    fileType: 'code',
    entryPointSpecifier: undefined,
    isExternallyImported: false,
    singleImports: [],
    barrelImports: [],
    dynamicImports: [],
    exports: [],
    singleReexports: [],
    barrelReexports: [],
  };
  projectInfo = getProjectInfo(TEST_PROJECT_DIR);
  expect(projectInfo).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_TS_NEW]: EXPECTED_FILE_TS_NEW,
  });

  // Modify the new new file
  writeFileSync(FILE_TS_NEW, `console.log()`);
  updateCacheFromFileSystem(
    packageSettings.packageRootDir,
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
    packageSettings,
    Date.now()
  );
  const EXPECTED_FILE_TS_NEW_UPDATED: StrippedAnalyzedFileDetails = {
    fileType: 'code',
    entryPointSpecifier: undefined,
    isExternallyImported: false,
    singleImports: [],
    barrelImports: [],
    dynamicImports: [],
    exports: [],
    singleReexports: [],
    barrelReexports: [],
  };
  projectInfo = getProjectInfo(TEST_PROJECT_DIR);
  expect(projectInfo).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_TS_NEW]: EXPECTED_FILE_TS_NEW_UPDATED,
  });

  // Modify the new file with invalid code (testing fallback to ensure project
  // info isn't changed in any way)
  writeFileSync(FILE_TS_NEW, `+_)(*&^%$%)`);
  updateCacheFromFileSystem(
    packageSettings.packageRootDir,
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
    packageSettings,
    Date.now()
  );
  projectInfo = getProjectInfo(TEST_PROJECT_DIR);
  expect(projectInfo).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_TS_NEW]: EXPECTED_FILE_TS_NEW_UPDATED,
  });

  // Delete the file
  unlinkSync(FILE_TS_NEW);
  updateCacheFromFileSystem(
    packageSettings.packageRootDir,
    {
      added: [],
      modified: [],
      deleted: [FILE_TS_NEW],
    },
    [],
    packageSettings,
    Date.now()
  );
  projectInfo = getProjectInfo(TEST_PROJECT_DIR);
  expect(projectInfo).toMatchAnalyzedSpec(EXPECTED);
});

it('Updates project cache in bulk for a non-code file', () => {
  initializeProject(packageSettings);

  let projectInfo = getProjectInfo(TEST_PROJECT_DIR);
  expect(projectInfo).toMatchAnalyzedSpec(EXPECTED);

  // Add a new file
  writeFileSync(FILE_JSON_NEW, '{}');
  updateCacheFromFileSystem(
    packageSettings.packageRootDir,
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
    packageSettings,
    Date.now()
  );
  const EXPECTED_FILE_JSON_NEW: StrippedAnalyzedFileDetails = {
    fileType: 'other',
  };
  projectInfo = getProjectInfo(TEST_PROJECT_DIR);
  expect(projectInfo).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_JSON_NEW]: EXPECTED_FILE_JSON_NEW,
  });

  // Modify the new new file
  writeFileSync(FILE_JSON_NEW, `{ "foo": 10 }`);
  updateCacheFromFileSystem(
    packageSettings.packageRootDir,
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
    packageSettings,
    Date.now()
  );
  const EXPECTED_FILE_JSON_NEW_UPDATED: StrippedAnalyzedFileDetails = {
    fileType: 'other',
  };
  projectInfo = getProjectInfo(TEST_PROJECT_DIR);
  expect(projectInfo).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_JSON_NEW]: EXPECTED_FILE_JSON_NEW_UPDATED,
  });

  // Delete the file
  unlinkSync(FILE_JSON_NEW);
  updateCacheFromFileSystem(
    packageSettings.packageRootDir,
    {
      added: [],
      modified: [],
      deleted: [FILE_JSON_NEW],
    },
    [],
    packageSettings,
    Date.now()
  );
  projectInfo = getProjectInfo(TEST_PROJECT_DIR);
  expect(projectInfo).toMatchAnalyzedSpec(EXPECTED);
});
