import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from '@typescript-eslint/typescript-estree';
import { getDirname } from 'cross-dirname';

import type { StrippedAnalyzedFileDetails } from '../../../__test__/util.js';
import { getPackageCacheEntryForFile } from '../../../settings/settings.js';
import type { AnalyzedCodeFileDetails, AnalyzedOtherFileDetails } from '../../../types/analyzed.js';
import {
  getProjectInfo,
  initializeRepo,
  updateCacheForFile,
  updateCacheFromFileSystem,
} from '../../module.js';

function assertDefined<T>(value: T, message: string): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

function assertCodeFile(
  value: AnalyzedCodeFileDetails | AnalyzedOtherFileDetails | undefined,
  message: string
): asserts value is AnalyzedCodeFileDetails {
  if (!value || value.fileType !== 'code') {
    throw new Error(message);
  }
}

// Regression guard for the `initializePackageInfo` duplication bug: each
// (filePath, importEntry.type) pair must appear at most once in an
// externallyImportedBy list.
function expectNoDuplicateExternalImporters(
  entries: ReadonlyArray<{ filePath: string; importEntry: { type: string } }>
) {
  const keys = entries.map((e) => `${e.filePath}|${e.importEntry.type}`);
  expect(new Set(keys).size).toBe(keys.length);
}

const MONOREPO_PROJECT_DIR = join(getDirname(), 'project', 'monorepo');
const PACKAGE_ONE_DIR = join(MONOREPO_PROJECT_DIR, 'packages', 'packageOne');
const PACKAGE_TWO_DIR = join(MONOREPO_PROJECT_DIR, 'packages', 'packageTwo');

const FILE_A = join(PACKAGE_ONE_DIR, 'a.ts');
const FILE_B = join(PACKAGE_ONE_DIR, 'b.ts');
const FILE_C = join(PACKAGE_TWO_DIR, 'c.ts');
const FILE_D = join(PACKAGE_TWO_DIR, 'd.ts');
const FILE_E = join(PACKAGE_TWO_DIR, 'e.ts');
const FILE_TS_NEW_PKG1 = join(PACKAGE_ONE_DIR, 'new.ts');
const FILE_TS_NEW_PKG2 = join(PACKAGE_TWO_DIR, 'new.ts');
const FILE_JSON_NEW = join(PACKAGE_ONE_DIR, 'new.json');

// fast-import.config.json and package.json files live inside each
// packageRootDir and are picked up by the project scanner as non-code files.
//
// The package.json files are load-bearing for these tests: initializePackageInfo
// identifies first-party packages by the `name` field in each package.json and
// matches cross-package imports against those names. If either package.json
// were missing, packageName would be undefined and cross-package wiring would
// silently skip, causing every externallyImportedBy assertion below to fail.
const PKG1_CONFIG = join(PACKAGE_ONE_DIR, 'fast-import.config.json');
const PKG2_CONFIG = join(PACKAGE_TWO_DIR, 'fast-import.config.json');
const PKG1_PACKAGE_JSON = join(PACKAGE_ONE_DIR, 'package.json');
const PKG2_PACKAGE_JSON = join(PACKAGE_TWO_DIR, 'package.json');

const EXPECTED_OTHER_FILE: StrippedAnalyzedFileDetails = { fileType: 'other' };

const EMPTY_CODE_FILE: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  hasEntryPoints: false,
  hasExternallyImported: false,
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  exports: [],
  singleReexports: [],
  barrelReexports: [],
};

// Set up state by running initializeRepo, then return the package settings
// derived from the populated cache so that downstream updateCacheForFile /
// updateCacheFromFileSystem calls see real entry-point configuration.
function initialize() {
  initializeRepo({
    filename: FILE_A,
    settings: {
      'fast-import': { monorepoRootDir: MONOREPO_PROJECT_DIR },
    },
  });
  const packageOneSettings = getPackageCacheEntryForFile(FILE_A);
  const packageTwoSettings = getPackageCacheEntryForFile(FILE_C);
  assertDefined(packageOneSettings, 'packageOneSettings not populated by initializeRepo');
  assertDefined(packageTwoSettings, 'packageTwoSettings not populated by initializeRepo');
  return { packageOneSettings, packageTwoSettings };
}

// The d.ts cross-package single import of `One` from `packageOne/a` shows up
// as a thirdParty single import since `packageOne` is a bare specifier.
const FILE_D_SINGLE_IMPORT = {
  type: 'singleImport' as const,
  importAlias: 'One',
  importName: 'One',
  isTypeImport: true,
  moduleSpecifier: 'packageOne/a',
  resolvedModuleType: 'thirdParty' as const,
  rootModuleType: undefined,
};

// The e.ts cross-package barrel import of `packageOne` shows up as a thirdParty
// barrel import, which lights up externallyImportedBy on every entry-point
// export of the target package.
const FILE_E_BARREL_IMPORT = {
  type: 'barrelImport' as const,
  importAlias: 'pkg',
  moduleSpecifier: 'packageOne',
  resolvedModuleType: 'thirdParty' as const,
};

function buildExpectedFileA({
  withCrossPackage,
  additionalEntryPointExports = [],
}: {
  withCrossPackage: boolean;
  additionalEntryPointExports?: string[];
}): StrippedAnalyzedFileDetails {
  const oneExternallyImportedBy = withCrossPackage
    ? [
        {
          packageRootDir: PACKAGE_TWO_DIR,
          filePath: FILE_D,
          importEntry: FILE_D_SINGLE_IMPORT,
        },
        {
          packageRootDir: PACKAGE_TWO_DIR,
          filePath: FILE_E,
          importEntry: FILE_E_BARREL_IMPORT,
        },
      ]
    : [];
  // Any entry-point export in a.ts is picked up by e.ts's
  // `import * as pkg from 'packageOne'` barrel, so AlsoOne and each additional
  // entry-point export share the same externallyImportedBy shape.
  const barrelOnlyExternallyImportedBy = withCrossPackage
    ? [
        {
          packageRootDir: PACKAGE_TWO_DIR,
          filePath: FILE_E,
          importEntry: FILE_E_BARREL_IMPORT,
        },
      ]
    : [];

  return {
    fileType: 'code',
    hasEntryPoints: true,
    hasExternallyImported: false,
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
        externallyImportedBy: oneExternallyImportedBy,
        isEntryPoint: true,
        isExternallyImported: false,
      },
      {
        type: 'export',
        exportName: 'AlsoOne',
        isTypeExport: true,
        importedBy: [],
        barrelImportedBy: [],
        externallyImportedBy: barrelOnlyExternallyImportedBy,
        isEntryPoint: true,
        isExternallyImported: false,
      },
      ...additionalEntryPointExports.map((exportName) => ({
        type: 'export' as const,
        exportName,
        isTypeExport: true,
        importedBy: [],
        barrelImportedBy: [],
        externallyImportedBy: barrelOnlyExternallyImportedBy,
        isEntryPoint: true,
        isExternallyImported: false,
      })),
    ],
    singleReexports: [],
    barrelReexports: [],
  };
}

const EXPECTED_FILE_B: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  hasEntryPoints: false,
  hasExternallyImported: false,
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
        isEntryPoint: true,
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

const EXPECTED_FILE_C: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  hasEntryPoints: true,
  hasExternallyImported: false,
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  exports: [
    {
      type: 'export',
      exportName: 'Two',
      isTypeExport: true,
      importedBy: [],
      barrelImportedBy: [],
      externallyImportedBy: [],
      isEntryPoint: true,
      isExternallyImported: false,
    },
  ],
  singleReexports: [],
  barrelReexports: [],
};

const EXPECTED_FILE_D: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  hasEntryPoints: false,
  hasExternallyImported: false,
  singleImports: [FILE_D_SINGLE_IMPORT],
  barrelImports: [],
  dynamicImports: [],
  exports: [],
  singleReexports: [],
  barrelReexports: [],
};

const EXPECTED_FILE_E: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  hasEntryPoints: false,
  hasExternallyImported: false,
  singleImports: [],
  barrelImports: [FILE_E_BARREL_IMPORT],
  dynamicImports: [],
  exports: [],
  singleReexports: [],
  barrelReexports: [],
};

function expectedPkg1({
  withCrossPackage,
  extras = {},
}: {
  withCrossPackage: boolean;
  extras?: Record<string, StrippedAnalyzedFileDetails>;
}) {
  return {
    [FILE_A]: buildExpectedFileA({ withCrossPackage }),
    [FILE_B]: EXPECTED_FILE_B,
    [PKG1_CONFIG]: EXPECTED_OTHER_FILE,
    [PKG1_PACKAGE_JSON]: EXPECTED_OTHER_FILE,
    ...extras,
  };
}

const EXPECTED_PKG2 = {
  [FILE_C]: EXPECTED_FILE_C,
  [FILE_D]: EXPECTED_FILE_D,
  [FILE_E]: EXPECTED_FILE_E,
  [PKG2_CONFIG]: EXPECTED_OTHER_FILE,
  [PKG2_PACKAGE_JSON]: EXPECTED_OTHER_FILE,
};

function parseContents(contents: string) {
  return parse(contents, {
    loc: true,
    range: true,
    tokens: true,
    jsx: true,
  });
}

const EMPTY_AST = parseContents('');

afterEach(() => {
  for (const path of [FILE_TS_NEW_PKG1, FILE_TS_NEW_PKG2, FILE_JSON_NEW]) {
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
});

it('Initializes both packages and returns correct project info per package', () => {
  initialize();

  const pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(expectedPkg1({ withCrossPackage: true }));

  const pkg2Info = getProjectInfo(PACKAGE_TWO_DIR);
  expect(pkg2Info).toMatchAnalyzedSpec(EXPECTED_PKG2);
});

it('Cross-package singleImport populates externallyImportedBy on the matching entry-point export', () => {
  initialize();

  const pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  const fileA = pkg1Info.files.get(FILE_A);
  assertCodeFile(fileA, 'FILE_A missing or not a code file');

  // The `One` entry-point export is directly named in d.ts's cross-package
  // single import, so it should reflect that importer (alongside the barrel
  // import from e.ts).
  const oneExport = fileA.exports.find((e) => e.exportName === 'One');
  assertDefined(oneExport, 'One export missing on FILE_A');
  const singleImporters = oneExport.externallyImportedBy.filter(
    (e) => e.importEntry.type === 'singleImport'
  );
  expect(singleImporters).toHaveLength(1);
  expect(singleImporters[0]).toMatchObject({
    packageRootDir: PACKAGE_TWO_DIR,
    filePath: FILE_D,
    importEntry: { type: 'singleImport', importName: 'One' },
  });

  // packageEntryPointExports should expose `One` by name.
  expect(pkg1Info.packageEntryPointExports.get('One')).toBe(oneExport);
});

it('packageEntryPointExports iterates as a Map keyed by export name', () => {
  initialize();

  const pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  const pkg1Entries = [...pkg1Info.packageEntryPointExports.entries()];
  const pkg1KeysSorted = pkg1Entries.map(([key]) => key).sort();
  expect(pkg1KeysSorted).toEqual(['AlsoOne', 'One']);
  for (const [key, entry] of pkg1Entries) {
    expect(entry.exportName).toBe(key);
  }

  const pkg2Info = getProjectInfo(PACKAGE_TWO_DIR);
  const pkg2KeysSorted = [...pkg2Info.packageEntryPointExports.keys()].sort();
  expect(pkg2KeysSorted).toEqual(['Two']);
});

it('Cross-package barrelImport populates externallyImportedBy on every entry-point export', () => {
  initialize();

  const pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  const fileA = pkg1Info.files.get(FILE_A);
  assertCodeFile(fileA, 'FILE_A missing or not a code file');

  // Each entry-point export in packageOne should see the barrel importer in
  // packageTwo/e.ts.
  for (const exportName of ['One', 'AlsoOne'] as const) {
    const exportEntry = fileA.exports.find((entry) => entry.exportName === exportName);
    if (!exportEntry) {
      throw new Error(`${exportName} export missing on FILE_A`);
    }
    const barrelImporters = exportEntry.externallyImportedBy.filter(
      (e) => e.importEntry.type === 'barrelImport'
    );
    expect(barrelImporters).toHaveLength(1);
    expect(barrelImporters[0]).toMatchObject({
      packageRootDir: PACKAGE_TWO_DIR,
      filePath: FILE_E,
      importEntry: { type: 'barrelImport', moduleSpecifier: 'packageOne' },
    });
  }
});

it('Package isolation: adding a file to packageOne does not affect packageTwo', () => {
  const { packageOneSettings } = initialize();

  updateCacheForFile(FILE_TS_NEW_PKG1, '', EMPTY_AST, packageOneSettings);

  const pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(
    expectedPkg1({
      withCrossPackage: true,
      extras: { [FILE_TS_NEW_PKG1]: EMPTY_CODE_FILE },
    })
  );

  // packageTwo is unaffected
  const pkg2Info = getProjectInfo(PACKAGE_TWO_DIR);
  expect(pkg2Info).toMatchAnalyzedSpec(EXPECTED_PKG2);
});

it('Updates packageOne cache when a new file is added via updateCacheForFile', () => {
  const { packageOneSettings } = initialize();

  let pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(expectedPkg1({ withCrossPackage: true }));

  updateCacheForFile(FILE_TS_NEW_PKG1, '', EMPTY_AST, packageOneSettings);

  pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(
    expectedPkg1({
      withCrossPackage: true,
      extras: { [FILE_TS_NEW_PKG1]: EMPTY_CODE_FILE },
    })
  );
});

it('Updates packageTwo cache when a new file is added via updateCacheForFile', () => {
  const { packageTwoSettings } = initialize();

  let pkg2Info = getProjectInfo(PACKAGE_TWO_DIR);
  expect(pkg2Info).toMatchAnalyzedSpec(EXPECTED_PKG2);

  updateCacheForFile(FILE_TS_NEW_PKG2, '', EMPTY_AST, packageTwoSettings);

  pkg2Info = getProjectInfo(PACKAGE_TWO_DIR);
  expect(pkg2Info).toMatchAnalyzedSpec({
    ...EXPECTED_PKG2,
    [FILE_TS_NEW_PKG2]: EMPTY_CODE_FILE,
  });

  // packageOne is unaffected by cache updates scoped to packageTwo.
  const pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(expectedPkg1({ withCrossPackage: true }));
});

it('Updates packageOne cache when an unused export is added to an existing file', () => {
  const { packageOneSettings } = initialize();

  // Preserve both entry-point exports and add a new one
  const FILE_A_UPDATED_CONTENTS = `export type One = string;
export type AlsoOne = number;
export type Another = string;
`;

  updateCacheForFile(
    FILE_A,
    FILE_A_UPDATED_CONTENTS,
    parseContents(FILE_A_UPDATED_CONTENTS),
    packageOneSettings
  );

  const EXPECTED_FILE_A_UPDATED = buildExpectedFileA({
    withCrossPackage: true,
    additionalEntryPointExports: ['Another'],
  });

  const pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec({
    [FILE_A]: EXPECTED_FILE_A_UPDATED,
    [FILE_B]: EXPECTED_FILE_B,
    [PKG1_CONFIG]: EXPECTED_OTHER_FILE,
    [PKG1_PACKAGE_JSON]: EXPECTED_OTHER_FILE,
  });

  // packageTwo is unaffected
  const pkg2Info = getProjectInfo(PACKAGE_TWO_DIR);
  expect(pkg2Info).toMatchAnalyzedSpec(EXPECTED_PKG2);
});

it('Updates packageOne project cache in bulk for a code file', () => {
  const { packageOneSettings } = initialize();

  let pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(expectedPkg1({ withCrossPackage: true }));

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

  pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(
    expectedPkg1({
      withCrossPackage: true,
      extras: { [FILE_TS_NEW_PKG1]: EMPTY_CODE_FILE },
    })
  );

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

  pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(
    expectedPkg1({
      withCrossPackage: true,
      extras: { [FILE_TS_NEW_PKG1]: EMPTY_CODE_FILE },
    })
  );

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
  expect(pkg1Info).toMatchAnalyzedSpec(
    expectedPkg1({
      withCrossPackage: true,
      extras: { [FILE_TS_NEW_PKG1]: EMPTY_CODE_FILE },
    })
  );

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
  expect(pkg1Info).toMatchAnalyzedSpec(expectedPkg1({ withCrossPackage: true }));

  // packageTwo still unchanged throughout
  expect(getProjectInfo(PACKAGE_TWO_DIR)).toMatchAnalyzedSpec(EXPECTED_PKG2);
});

it('Updates project cache in bulk for a non-code file in packageOne', () => {
  const { packageOneSettings } = initialize();

  let pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(expectedPkg1({ withCrossPackage: true }));

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

  pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(
    expectedPkg1({
      withCrossPackage: true,
      extras: { [FILE_JSON_NEW]: EXPECTED_OTHER_FILE },
    })
  );

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

  pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  expect(pkg1Info).toMatchAnalyzedSpec(
    expectedPkg1({
      withCrossPackage: true,
      extras: { [FILE_JSON_NEW]: EXPECTED_OTHER_FILE },
    })
  );

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
  expect(pkg1Info).toMatchAnalyzedSpec(expectedPkg1({ withCrossPackage: true }));
});

it('Cache update adds new cross-package singleImport', () => {
  const { packageTwoSettings } = initialize();

  // Add a brand-new packageTwo file that introduces a cross-package single
  // import of `AlsoOne`. After initializeRepo, packageOne/a.ts's `AlsoOne`
  // export has zero single importers (only a barrel importer from e.ts);
  // cache-update propagation should bring the count to one.
  const NEW_FILE_CONTENTS = `import type { AlsoOne } from 'packageOne/a';

const n: AlsoOne = 1;
console.log(n);
`;
  updateCacheForFile(
    FILE_TS_NEW_PKG2,
    NEW_FILE_CONTENTS,
    parseContents(NEW_FILE_CONTENTS),
    packageTwoSettings
  );

  const pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  const fileA = pkg1Info.files.get(FILE_A);
  assertCodeFile(fileA, 'FILE_A missing or not a code file');

  const alsoOneExport = fileA.exports.find((e) => e.exportName === 'AlsoOne');
  assertDefined(alsoOneExport, 'AlsoOne export missing on FILE_A');
  const singleImporters = alsoOneExport.externallyImportedBy.filter(
    (e) => e.importEntry.type === 'singleImport'
  );
  expect(singleImporters).toHaveLength(1);
  expect(singleImporters[0]).toMatchObject({
    packageRootDir: PACKAGE_TWO_DIR,
    filePath: FILE_TS_NEW_PKG2,
    importEntry: { type: 'singleImport', importName: 'AlsoOne' },
  });

  // Regression guards for the `initializePackageInfo` duplication bug: total
  // length must match exactly and no (filePath, importEntry.type) pair may
  // appear more than once.
  expect(alsoOneExport.externallyImportedBy).toHaveLength(2);
  expectNoDuplicateExternalImporters(alsoOneExport.externallyImportedBy);

  const oneExport = fileA.exports.find((e) => e.exportName === 'One');
  assertDefined(oneExport, 'One export missing on FILE_A');
  expect(oneExport.externallyImportedBy).toHaveLength(2);
  expectNoDuplicateExternalImporters(oneExport.externallyImportedBy);
});

it('Cache update removes an existing cross-package singleImport', () => {
  const { packageTwoSettings } = initialize();

  // Remove d.ts's cross-package single import via updateCacheForFile. The
  // export on packageOne/a.ts should no longer list d.ts as an external
  // importer after cache-update propagation.
  const D_WITHOUT_IMPORT = `// @ts-expect-error — placeholder during test
const one: unknown = undefined;
console.log(one);
`;
  updateCacheForFile(FILE_D, D_WITHOUT_IMPORT, parseContents(D_WITHOUT_IMPORT), packageTwoSettings);

  const pkg1Info = getProjectInfo(PACKAGE_ONE_DIR);
  const fileA = pkg1Info.files.get(FILE_A);
  assertCodeFile(fileA, 'FILE_A missing or not a code file');
  const oneExport = fileA.exports.find((e) => e.exportName === 'One');
  const singleImporters =
    oneExport?.externallyImportedBy.filter((e) => e.importEntry.type === 'singleImport') ?? [];
  expect(singleImporters).toHaveLength(0);
});
