import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import { getProjectInfo, initializeRepo } from '../../../module.js';

function assertDefined<T>(value: T, message: string): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

function expectNoDuplicateExternalImporters(
  entries: ReadonlyArray<{ filePath: string; importEntry: { type: string } }>
) {
  const keys = entries.map((e) => `${e.filePath}|${e.importEntry.type}`);
  expect(new Set(keys).size).toBe(keys.length);
}

const MONOREPO_PROJECT_DIR = join(getDirname(), 'project', 'monorepo');
const PACKAGES_DIR = join(MONOREPO_PROJECT_DIR, 'packages');
const PACKAGE_A_DIR = join(PACKAGES_DIR, 'packageA');
const PACKAGE_B_DIR = join(PACKAGES_DIR, 'packageB');
const PACKAGE_C_DIR = join(PACKAGES_DIR, 'packageC');
const PACKAGE_D_DIR = join(PACKAGES_DIR, 'packageD');
const PACKAGE_E_DIR = join(PACKAGES_DIR, 'packageE');

const FILE_A = join(PACKAGE_A_DIR, 'a.ts');
const FILE_B = join(PACKAGE_B_DIR, 'b.ts');
const FILE_C = join(PACKAGE_C_DIR, 'c.ts');
const FILE_D = join(PACKAGE_D_DIR, 'd.ts');
const FILE_E = join(PACKAGE_E_DIR, 'e.ts');

function initialize() {
  initializeRepo({
    filename: FILE_A,
    settings: {
      'fast-import': { monorepoRootDir: MONOREPO_PROJECT_DIR },
    },
  });
}

it('Cross-package import cycle populates externallyImportedBy on both sides', () => {
  initialize();

  // packageA's A is imported by both packageB (single) and packageE (barrel);
  // check the single importer from packageB here. The barrel importer from
  // packageE is checked in the dedicated barrel-import test.
  const pkgAInfo = getProjectInfo(PACKAGE_A_DIR);
  const aExport = pkgAInfo.packageEntryPointExports.get('A');
  assertDefined(aExport, 'A export missing on packageA');
  const aSingleImporters = aExport.externallyImportedBy.filter(
    (entry) => entry.importEntry.type === 'singleImport'
  );
  expect(aSingleImporters).toHaveLength(1);
  expect(aSingleImporters[0]).toMatchObject({
    packageRootDir: PACKAGE_B_DIR,
    filePath: FILE_B,
    importEntry: {
      type: 'singleImport',
      importName: 'A',
      moduleSpecifier: 'packageA/a',
    },
  });
  expectNoDuplicateExternalImporters(aExport.externallyImportedBy);

  const pkgBInfo = getProjectInfo(PACKAGE_B_DIR);
  const bExport = pkgBInfo.packageEntryPointExports.get('B');
  assertDefined(bExport, 'B export missing on packageB');
  expect(bExport.externallyImportedBy).toHaveLength(1);
  expect(bExport.externallyImportedBy[0]).toMatchObject({
    packageRootDir: PACKAGE_A_DIR,
    filePath: FILE_A,
    importEntry: {
      type: 'singleImport',
      importName: 'B',
      moduleSpecifier: 'packageB/b',
    },
  });
  expectNoDuplicateExternalImporters(bExport.externallyImportedBy);
});

it('Cross-package barrelImport populates externallyImportedBy on every entry-point export', () => {
  initialize();

  const pkgAInfo = getProjectInfo(PACKAGE_A_DIR);
  const aExport = pkgAInfo.packageEntryPointExports.get('A');
  assertDefined(aExport, 'A export missing on packageA');

  const barrelImporters = aExport.externallyImportedBy.filter(
    (entry) => entry.importEntry.type === 'barrelImport'
  );
  expect(barrelImporters).toHaveLength(1);
  expect(barrelImporters[0]).toMatchObject({
    packageRootDir: PACKAGE_E_DIR,
    filePath: FILE_E,
    importEntry: {
      type: 'barrelImport',
      moduleSpecifier: 'packageA',
    },
  });
  expectNoDuplicateExternalImporters(aExport.externallyImportedBy);
});

it('Named barrel reexport entry point tracks cross-package importer', () => {
  initialize();

  const pkgDInfo = getProjectInfo(PACKAGE_D_DIR);
  const utilsExport = pkgDInfo.packageEntryPointExports.get('utils');
  assertDefined(utilsExport, 'utils export missing on packageD');
  expect(utilsExport.type).toBe('barrelReexport');
  expect(utilsExport.externallyImportedBy).toHaveLength(1);
  expect(utilsExport.externallyImportedBy[0]).toMatchObject({
    packageRootDir: PACKAGE_C_DIR,
    filePath: FILE_C,
    importEntry: {
      type: 'singleImport',
      importName: 'utils',
      moduleSpecifier: 'packageD/d',
    },
  });
  expectNoDuplicateExternalImporters(utilsExport.externallyImportedBy);
});

it('Entry-point export that is not imported by any other package has empty externallyImportedBy', () => {
  initialize();

  const pkgCInfo = getProjectInfo(PACKAGE_C_DIR);
  const cExport = pkgCInfo.packageEntryPointExports.get('C');
  assertDefined(cExport, 'C export missing on packageC');
  expect(cExport.externallyImportedBy).toEqual([]);
  expectNoDuplicateExternalImporters(cExport.externallyImportedBy);
});

it('Entry-point exports for all four packages appear in packageEntryPointExports', () => {
  initialize();

  expect([...getProjectInfo(PACKAGE_A_DIR).packageEntryPointExports.keys()]).toEqual(['A']);
  expect([...getProjectInfo(PACKAGE_B_DIR).packageEntryPointExports.keys()]).toEqual(['B']);
  expect([...getProjectInfo(PACKAGE_C_DIR).packageEntryPointExports.keys()]).toEqual(['C']);
  expect([...getProjectInfo(PACKAGE_D_DIR).packageEntryPointExports.keys()]).toEqual(['utils']);
});

it('Files inside packageD beyond the entry point are reachable via getProjectInfo', () => {
  initialize();

  const pkgDInfo = getProjectInfo(PACKAGE_D_DIR);
  // d.ts, internal.ts, internal2.ts, package.json, fast-import.config.json = 5
  expect(pkgDInfo.files.size).toBe(5);
  expect(pkgDInfo.files.has(FILE_D)).toBe(true);
  expect(pkgDInfo.files.has(join(PACKAGE_D_DIR, 'internal.ts'))).toBe(true);
  expect(pkgDInfo.files.has(join(PACKAGE_D_DIR, 'internal2.ts'))).toBe(true);
});
