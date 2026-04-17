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

const MONOREPO_PROJECT_DIR = join(getDirname(), 'project', 'monorepo');
const PACKAGE_ONE_DIR = join(MONOREPO_PROJECT_DIR, 'packages', 'packageOne');
const PACKAGE_TWO_DIR = join(MONOREPO_PROJECT_DIR, 'packages', 'packageTwo');

const FILE_A = join(PACKAGE_ONE_DIR, 'a.ts');
const FILE_B = join(PACKAGE_ONE_DIR, 'b.ts');
const FILE_C = join(PACKAGE_TWO_DIR, 'c.ts');
const FILE_D = join(PACKAGE_TWO_DIR, 'd.ts');
const FILE_TS_NEW_PKG1 = join(PACKAGE_ONE_DIR, 'new.ts');
const FILE_TS_NEW_PKG2 = join(PACKAGE_TWO_DIR, 'new.ts');
const FILE_JSON_NEW = join(PACKAGE_ONE_DIR, 'new.json');

// fast-import.config.json files live inside each packageRootDir, so they are
// picked up by the project scanner as non-code files
const PKG1_CONFIG = join(PACKAGE_ONE_DIR, 'fast-import.config.json');
const PKG2_CONFIG = join(PACKAGE_TWO_DIR, 'fast-import.config.json');

const EXPECTED_CONFIG_FILE: StrippedAnalyzedFileDetails = { fileType: 'other' };

const packageOneSettings: ParsedPackageSettings = {
  repoRootDir: MONOREPO_PROJECT_DIR,
  packageRootDir: PACKAGE_ONE_DIR,
  wildcardAliases: {},
  fixedAliases: {},
  entryPoints: [],
  ignorePatterns: [],
  ignoreOverridePatterns: [],
  testFilePatterns: [],
};

const packageTwoSettings: ParsedPackageSettings = {
  repoRootDir: MONOREPO_PROJECT_DIR,
  packageRootDir: PACKAGE_TWO_DIR,
  wildcardAliases: {},
  fixedAliases: {},
  entryPoints: [],
  ignorePatterns: [],
  ignoreOverridePatterns: [],
  testFilePatterns: [],
};

// Expected analyzed specs for packageOne (a.ts exports One, b.ts imports it)
const EXPECTED_FILE_A: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  hasEntryPoints: false,
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
    },
  ],
  singleReexports: [],
  barrelReexports: [],
};

const EXPECTED_FILE_B: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  hasEntryPoints: false,
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

// Expected analyzed specs for packageTwo (c.ts exports Two, d.ts imports it)
const EXPECTED_FILE_C: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  hasEntryPoints: false,
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  exports: [
    {
      type: 'export',
      exportName: 'Two',
      isTypeExport: true,
      importedBy: [
        {
          filePath: FILE_D,
          importEntry: {
            type: 'singleImport',
            importAlias: 'Two',
            importName: 'Two',
            isTypeImport: true,
            moduleSpecifier: './c',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_C,
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_C,
          },
        },
      ],
      barrelImportedBy: [],
      externallyImportedBy: [],
      isEntryPoint: false,
    },
  ],
  singleReexports: [],
  barrelReexports: [],
};

const EXPECTED_FILE_D: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  hasEntryPoints: false,
  singleImports: [
    {
      type: 'singleImport',
      importAlias: 'Two',
      importName: 'Two',
      isTypeImport: true,
      moduleSpecifier: './c',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_C,
      rootModuleType: 'firstPartyCode',
      rootModulePath: FILE_C,
      rootExportEntry: {
        type: 'export',
        exportName: 'Two',
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

const EXPECTED_PKG1 = {
  [FILE_A]: EXPECTED_FILE_A,
  [FILE_B]: EXPECTED_FILE_B,
  [PKG1_CONFIG]: EXPECTED_CONFIG_FILE,
};

const EXPECTED_PKG2 = {
  [FILE_C]: EXPECTED_FILE_C,
  [FILE_D]: EXPECTED_FILE_D,
  [PKG2_CONFIG]: EXPECTED_CONFIG_FILE,
};

const EMPTY_AST = parse('', {
  loc: true,
  range: true,
  tokens: true,
  jsx: true,
});

afterEach(() => {
  for (const path of [FILE_TS_NEW_PKG1, FILE_TS_NEW_PKG2, FILE_JSON_NEW]) {
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
});

it('Initializes both packages and returns correct project info per package', () => {
  initializeProject(packageOneSettings);
  initializeProject(packageTwoSettings);

  const pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(EXPECTED_PKG1);

  const pkg2Info = getProjectInfo(PACKAGE_TWO_DIR);
  expect(pkg2Info).toMatchAnalyzedSpec(EXPECTED_PKG2);
});

it('Package isolation: adding a file to packageOne does not affect packageTwo', () => {
  initializeProject(packageOneSettings);
  initializeProject(packageTwoSettings);

  updateCacheForFile(FILE_TS_NEW_PKG1, '', EMPTY_AST, packageOneSettings);

  const EXPECTED_FILE_NEW: StrippedAnalyzedFileDetails = {
    fileType: 'code',
    hasEntryPoints: false,
    singleImports: [],
    barrelImports: [],
    dynamicImports: [],
    exports: [],
    singleReexports: [],
    barrelReexports: [],
  };

  // packageOne now has 3 files (plus the config file)
  const pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_TS_NEW_PKG1]: EXPECTED_FILE_NEW,
    [PKG1_CONFIG]: EXPECTED_CONFIG_FILE,
  });

  // packageTwo is unaffected
  const pkg2Info = getProjectInfo(PACKAGE_TWO_DIR);
  expect(pkg2Info).toMatchAnalyzedSpec(EXPECTED_PKG2);
});

it('Updates packageOne cache when a new file is added via updateCacheForFile', () => {
  initializeProject(packageOneSettings);
  initializeProject(packageTwoSettings);

  let pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(EXPECTED_PKG1);

  updateCacheForFile(FILE_TS_NEW_PKG1, '', EMPTY_AST, packageOneSettings);

  const EXPECTED_FILE_TS_NEW: StrippedAnalyzedFileDetails = {
    fileType: 'code',
    hasEntryPoints: false,
    singleImports: [],
    barrelImports: [],
    dynamicImports: [],
    exports: [],
    singleReexports: [],
    barrelReexports: [],
  };

  pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_TS_NEW_PKG1]: EXPECTED_FILE_TS_NEW,
    [PKG1_CONFIG]: EXPECTED_CONFIG_FILE,
  });
});

it('Updates packageTwo cache when a new file is added via updateCacheForFile', () => {
  initializeProject(packageOneSettings);
  initializeProject(packageTwoSettings);

  let pkg2Info = getProjectInfo(PACKAGE_TWO_DIR);
  expect(pkg2Info).toMatchAnalyzedSpec(EXPECTED_PKG2);

  updateCacheForFile(FILE_TS_NEW_PKG2, '', EMPTY_AST, packageTwoSettings);

  const EXPECTED_FILE_TS_NEW: StrippedAnalyzedFileDetails = {
    fileType: 'code',
    hasEntryPoints: false,
    singleImports: [],
    barrelImports: [],
    dynamicImports: [],
    exports: [],
    singleReexports: [],
    barrelReexports: [],
  };

  pkg2Info = getProjectInfo(PACKAGE_TWO_DIR);
  expect(pkg2Info).toMatchAnalyzedSpec({
    [FILE_C]: EXPECTED_FILE_C,
    [FILE_D]: EXPECTED_FILE_D,
    [FILE_TS_NEW_PKG2]: EXPECTED_FILE_TS_NEW,
    [PKG2_CONFIG]: EXPECTED_CONFIG_FILE,
  });

  // packageOne is unaffected
  const pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(EXPECTED_PKG1);
});

it('Updates packageOne cache when an unused export is added to an existing file', () => {
  initializeProject(packageOneSettings);
  initializeProject(packageTwoSettings);

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
    packageOneSettings
  );

  const EXPECTED_FILE_A_UPDATED: StrippedAnalyzedFileDetails = {
    fileType: 'code',
    hasEntryPoints: false,
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
      },
      {
        type: 'export',
        exportName: 'Two',
        isTypeExport: true,
        importedBy: [],
        barrelImportedBy: [],
        externallyImportedBy: [],
        isEntryPoint: false,
      },
    ],
    singleReexports: [],
    barrelReexports: [],
  };

  const pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A_UPDATED,
    [FILE_B]: EXPECTED_FILE_B,
    [PKG1_CONFIG]: EXPECTED_CONFIG_FILE,
  });

  // packageTwo is unaffected
  const pkg2Info = getProjectInfo(PACKAGE_TWO_DIR);
  expect(pkg2Info).toMatchAnalyzedSpec(EXPECTED_PKG2);
});

it('Updates packageOne project cache in bulk for a code file', () => {
  initializeProject(packageOneSettings);
  initializeProject(packageTwoSettings);

  let pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(EXPECTED_PKG1);

  // Add a new file to packageOne
  writeFileSync(FILE_TS_NEW_PKG1, '');
  updateCacheFromFileSystem(
    packageOneSettings.packageRootDir,
    {
      added: [{ filePath: FILE_TS_NEW_PKG1, latestUpdatedAt: Date.now() }],
      modified: [],
      deleted: [],
    },
    [],
    packageOneSettings,
    Date.now()
  );

  const EXPECTED_FILE_TS_NEW: StrippedAnalyzedFileDetails = {
    fileType: 'code',
    hasEntryPoints: false,
    singleImports: [],
    barrelImports: [],
    dynamicImports: [],
    exports: [],
    singleReexports: [],
    barrelReexports: [],
  };

  pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_TS_NEW_PKG1]: EXPECTED_FILE_TS_NEW,
    [PKG1_CONFIG]: EXPECTED_CONFIG_FILE,
  });

  // packageTwo unchanged
  expect(getProjectInfo(PACKAGE_TWO_DIR)).toMatchAnalyzedSpec(EXPECTED_PKG2);

  // Modify the new file
  writeFileSync(FILE_TS_NEW_PKG1, `console.log()`);
  updateCacheFromFileSystem(
    packageOneSettings.packageRootDir,
    {
      added: [],
      modified: [{ filePath: FILE_TS_NEW_PKG1, latestUpdatedAt: Date.now() }],
      deleted: [],
    },
    [],
    packageOneSettings,
    Date.now()
  );

  const EXPECTED_FILE_TS_NEW_UPDATED: StrippedAnalyzedFileDetails = {
    fileType: 'code',
    hasEntryPoints: false,
    singleImports: [],
    barrelImports: [],
    dynamicImports: [],
    exports: [],
    singleReexports: [],
    barrelReexports: [],
  };

  pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_TS_NEW_PKG1]: EXPECTED_FILE_TS_NEW_UPDATED,
    [PKG1_CONFIG]: EXPECTED_CONFIG_FILE,
  });

  // Modify with invalid code (should keep previous state)
  writeFileSync(FILE_TS_NEW_PKG1, `+_)(*&^%$%)`);
  updateCacheFromFileSystem(
    packageOneSettings.packageRootDir,
    {
      added: [],
      modified: [{ filePath: FILE_TS_NEW_PKG1, latestUpdatedAt: Date.now() }],
      deleted: [],
    },
    [],
    packageOneSettings,
    Date.now()
  );

  pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_TS_NEW_PKG1]: EXPECTED_FILE_TS_NEW_UPDATED,
    [PKG1_CONFIG]: EXPECTED_CONFIG_FILE,
  });

  // Delete the file
  unlinkSync(FILE_TS_NEW_PKG1);
  updateCacheFromFileSystem(
    packageOneSettings.packageRootDir,
    {
      added: [],
      modified: [],
      deleted: [FILE_TS_NEW_PKG1],
    },
    [],
    packageOneSettings,
    Date.now()
  );

  pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(EXPECTED_PKG1);

  // packageTwo still unchanged throughout
  expect(getProjectInfo(PACKAGE_TWO_DIR)).toMatchAnalyzedSpec(EXPECTED_PKG2);
});

it('Updates project cache in bulk for a non-code file in packageOne', () => {
  initializeProject(packageOneSettings);
  initializeProject(packageTwoSettings);

  let pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(EXPECTED_PKG1);

  // Add a JSON file to packageOne
  writeFileSync(FILE_JSON_NEW, '{}');
  updateCacheFromFileSystem(
    packageOneSettings.packageRootDir,
    {
      added: [{ filePath: FILE_JSON_NEW, latestUpdatedAt: Date.now() }],
      modified: [],
      deleted: [],
    },
    [],
    packageOneSettings,
    Date.now()
  );

  const EXPECTED_FILE_JSON_NEW: StrippedAnalyzedFileDetails = {
    fileType: 'other',
  };

  pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_JSON_NEW]: EXPECTED_FILE_JSON_NEW,
    [PKG1_CONFIG]: EXPECTED_CONFIG_FILE,
  });

  // packageTwo unchanged
  expect(getProjectInfo(PACKAGE_TWO_DIR)).toMatchAnalyzedSpec(EXPECTED_PKG2);

  // Modify the JSON file
  writeFileSync(FILE_JSON_NEW, `{ "foo": 10 }`);
  updateCacheFromFileSystem(
    packageOneSettings.packageRootDir,
    {
      added: [],
      modified: [{ filePath: FILE_JSON_NEW, latestUpdatedAt: Date.now() }],
      deleted: [],
    },
    [],
    packageOneSettings,
    Date.now()
  );

  const EXPECTED_FILE_JSON_NEW_UPDATED: StrippedAnalyzedFileDetails = {
    fileType: 'other',
  };

  pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A,
    [FILE_B]: EXPECTED_FILE_B,
    [FILE_JSON_NEW]: EXPECTED_FILE_JSON_NEW_UPDATED,
    [PKG1_CONFIG]: EXPECTED_CONFIG_FILE,
  });

  // Delete the JSON file
  unlinkSync(FILE_JSON_NEW);
  updateCacheFromFileSystem(
    packageOneSettings.packageRootDir,
    {
      added: [],
      modified: [],
      deleted: [FILE_JSON_NEW],
    },
    [],
    packageOneSettings,
    Date.now()
  );

  pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(EXPECTED_PKG1);
});
