import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import type { StrippedAnalyzedFileDetails } from '../../../../__test__/util.js';
import { computeAnalyzedInfo } from '../../../computeAnalyzedInfo.js';
import { computeBaseInfo } from '../../../computeBaseInfo.js';
import { computeResolvedInfo } from '../../../computeResolvedInfo.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project', 'default');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'b.ts');
const FILE_C = join(TEST_PROJECT_DIR, 'c.ts');
const FILE_D = join(TEST_PROJECT_DIR, 'd.ts');
const FILE_E = join(TEST_PROJECT_DIR, 'e.ts');
const FILE_F = join(TEST_PROJECT_DIR, 'f.ts');
const FILE_G = join(TEST_PROJECT_DIR, 'g.ts');
const FILE_H = join(TEST_PROJECT_DIR, 'h.json');
const FILE_PACKAGE_JSON = join(TEST_PROJECT_DIR, 'package.json');

const CYCLE_FILE_A = join(TEST_PROJECT_DIR, 'cycle-a.js');
const CYCLE_FILE_B = join(TEST_PROJECT_DIR, 'cycle-b.js');
const CYCLE_FILE_C = join(TEST_PROJECT_DIR, 'cycle-c.js');

const EXPECTED_FILE_A: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  hasEntryPoints: true,
  isExternallyImported: false,
  singleImports: [
    {
      type: 'singleImport',
      moduleSpecifier: './b',
      importName: 'c1',
      importAlias: 'c1',
      isTypeImport: false,
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_B,
      rootModuleType: 'firstPartyCode',
      rootModulePath: FILE_C,
      rootExportEntry: {
        type: 'export',
        exportName: 'c1',
        isEntryPoint: false,
        isExternallyImported: false,
        isTypeExport: false,
      },
    },
    {
      type: 'singleImport',
      moduleSpecifier: './e',
      importName: 'd1',
      importAlias: 'd1',
      isTypeImport: false,
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_E,
      rootModuleType: 'firstPartyCode',
      rootModulePath: FILE_D,
      rootExportEntry: {
        type: 'export',
        exportName: 'd1',
        isEntryPoint: false,
        isExternallyImported: false,
        isTypeExport: false,
      },
    },
    {
      type: 'singleImport',
      moduleSpecifier: './e',
      importName: 'f',
      importAlias: 'f',
      isTypeImport: false,
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_E,
      rootModuleType: 'firstPartyCode',
      rootModulePath: FILE_E,
      rootExportEntry: {
        type: 'barrelReexport',
        exportName: 'f',
        isEntryPoint: false,
        isExternallyImported: false,
        moduleSpecifier: './f',
        resolvedModulePath: FILE_F,
        resolvedModuleType: 'firstPartyCode',
      },
    },
    {
      type: 'singleImport',
      moduleSpecifier: './f',
      importName: 'join',
      importAlias: 'join',
      isTypeImport: false,
      resolvedModulePath: FILE_F,
      resolvedModuleType: 'firstPartyCode',
      rootModuleType: 'builtin',
    },
    {
      type: 'singleImport',
      moduleSpecifier: './g?raw',
      importName: 'SourceCode',
      importAlias: 'SourceCode',
      isTypeImport: false,
      resolvedModulePath: FILE_G,
      resolvedModuleType: 'firstPartyCode',
      rootModuleType: undefined,
    },
    {
      type: 'singleImport',
      importAlias: 'h',
      importName: 'default',
      isTypeImport: false,
      moduleSpecifier: './h.json',
      resolvedModuleType: 'firstPartyOther',
      resolvedModulePath: FILE_H,
      rootModuleType: undefined,
    },
  ],
  barrelImports: [
    {
      type: 'barrelImport',
      importAlias: 'b',
      moduleSpecifier: './b',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_B,
    },
  ],
  dynamicImports: [],
  exports: [],
  singleReexports: [
    {
      type: 'singleReexport',
      exportName: 'ASourceCode',
      importName: 'SourceCode',
      importedBy: [],
      barrelImportedBy: [],
      externallyImportedBy: [],
      isEntryPoint: true,
      isExternallyImported: false,
      isTypeReexport: true,
      moduleSpecifier: './f',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_F,
      rootModuleType: 'thirdParty',
    },
  ],
  barrelReexports: [],
};

const EXPECTED_FILE_B: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  hasEntryPoints: false,
  isExternallyImported: false,
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  exports: [],
  singleReexports: [],
  barrelReexports: [
    {
      type: 'barrelReexport',
      moduleSpecifier: './c',
      exportName: undefined,
      isEntryPoint: false,
      isExternallyImported: false,
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_C,
      importedBy: [],
      barrelImportedBy: [],
      externallyImportedBy: [],
    },
    {
      type: 'barrelReexport',
      moduleSpecifier: './d',
      exportName: undefined,
      isEntryPoint: false,
      isExternallyImported: false,
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_D,
      importedBy: [],
      barrelImportedBy: [],
      externallyImportedBy: [],
    },
  ],
};

const EXPECTED_FILE_C: StrippedAnalyzedFileDetails = {
  fileType: 'code',
  hasEntryPoints: false,
  isExternallyImported: false,
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  exports: [
    {
      type: 'export',
      exportName: 'c1',
      isEntryPoint: false,
      isExternallyImported: false,
      isTypeExport: false,
      importedBy: [
        {
          filePath: FILE_A,
          importEntry: {
            type: 'singleImport',
            moduleSpecifier: './b',
            importName: 'c1',
            importAlias: 'c1',
            isTypeImport: false,
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_B,
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_C,
          },
        },
      ],
      barrelImportedBy: [
        {
          filePath: FILE_A,
          importEntry: {
            type: 'barrelImport',
            moduleSpecifier: './b',
            importAlias: 'b',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_B,
          },
        },
      ],
      externallyImportedBy: [],
    },
  ],
  singleReexports: [],
  barrelReexports: [],
};

const EXPECTED_CYCLE_FILE_A: StrippedAnalyzedFileDetails = {
  hasEntryPoints: false,
  isExternallyImported: false,
  exports: [],
  fileType: 'code',
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  singleReexports: [
    {
      type: 'singleReexport',
      exportName: 'a',
      importName: 'a',
      importedBy: [],
      barrelImportedBy: [],
      externallyImportedBy: [],
      isEntryPoint: false,
      isExternallyImported: false,
      isTypeReexport: false,
      moduleSpecifier: './cycle-b',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: CYCLE_FILE_B,
      rootModuleType: undefined,
    },
  ],
  barrelReexports: [],
};

const EXPECTED_CYCLE_FILE_B: StrippedAnalyzedFileDetails = {
  hasEntryPoints: false,
  isExternallyImported: false,
  exports: [],
  fileType: 'code',
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  singleReexports: [
    {
      type: 'singleReexport',
      exportName: 'a',
      importName: 'a',
      importedBy: [],
      barrelImportedBy: [],
      externallyImportedBy: [],
      isEntryPoint: false,
      isExternallyImported: false,
      isTypeReexport: false,
      moduleSpecifier: './cycle-c',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: CYCLE_FILE_C,
      rootModuleType: undefined,
    },
  ],
  barrelReexports: [],
};

const EXPECTED_CYCLE_FILE_C: StrippedAnalyzedFileDetails = {
  hasEntryPoints: false,
  isExternallyImported: false,
  exports: [],
  fileType: 'code',
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  singleReexports: [
    {
      type: 'singleReexport',
      exportName: 'a',
      importName: 'a',
      importedBy: [],
      barrelImportedBy: [],
      externallyImportedBy: [],
      isEntryPoint: false,
      isExternallyImported: false,
      isTypeReexport: false,
      moduleSpecifier: './cycle-a',
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: CYCLE_FILE_A,
      rootModuleType: undefined,
    },
  ],
  barrelReexports: [],
};

const EXPECTED_FILE_D: StrippedAnalyzedFileDetails = {
  hasEntryPoints: false,
  isExternallyImported: false,
  fileType: 'code',
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  exports: [
    {
      type: 'export',
      exportName: 'd1',
      isEntryPoint: false,
      isExternallyImported: false,
      isTypeExport: false,
      importedBy: [
        {
          filePath: FILE_A,
          importEntry: {
            type: 'singleImport',
            moduleSpecifier: './e',
            importName: 'd1',
            importAlias: 'd1',
            isTypeImport: false,
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_E,
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_D,
          },
        },
      ],
      barrelImportedBy: [
        {
          filePath: FILE_A,
          importEntry: {
            type: 'barrelImport',
            moduleSpecifier: './b',
            importAlias: 'b',
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_B,
          },
        },
      ],
      externallyImportedBy: [],
    },
  ],
  singleReexports: [],
  barrelReexports: [],
};

const EXPECTED_FILE_E: StrippedAnalyzedFileDetails = {
  hasEntryPoints: false,
  isExternallyImported: false,
  fileType: 'code',
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  exports: [],
  singleReexports: [
    {
      type: 'singleReexport',
      moduleSpecifier: './d',
      importName: 'd1',
      exportName: 'd1',
      isTypeReexport: false,
      isEntryPoint: false,
      isExternallyImported: false,
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_D,
      importedBy: [
        {
          filePath: FILE_A,
          importEntry: {
            type: 'singleImport',
            moduleSpecifier: './e',
            importName: 'd1',
            importAlias: 'd1',
            isTypeImport: false,
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_E,
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_D,
          },
        },
      ],
      barrelImportedBy: [],
      externallyImportedBy: [],
      rootModuleType: undefined,
    },
  ],
  barrelReexports: [
    {
      type: 'barrelReexport',
      moduleSpecifier: './f',
      exportName: 'f',
      isEntryPoint: false,
      isExternallyImported: false,
      resolvedModuleType: 'firstPartyCode',
      resolvedModulePath: FILE_F,
      importedBy: [
        {
          filePath: FILE_A,
          importEntry: {
            type: 'singleImport',
            moduleSpecifier: './e',
            importName: 'f',
            importAlias: 'f',
            isTypeImport: false,
            resolvedModuleType: 'firstPartyCode',
            resolvedModulePath: FILE_E,
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_E,
          },
        },
      ],
      barrelImportedBy: [],
      externallyImportedBy: [],
    },
  ],
};

const EXPECTED_FILE_F: StrippedAnalyzedFileDetails = {
  hasEntryPoints: false,
  isExternallyImported: false,
  fileType: 'code',
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  exports: [],
  singleReexports: [
    {
      type: 'singleReexport',
      moduleSpecifier: 'path',
      importName: 'join',
      exportName: 'join',
      isTypeReexport: false,
      isEntryPoint: false,
      isExternallyImported: false,
      resolvedModuleType: 'builtin',
      importedBy: [],
      barrelImportedBy: [],
      externallyImportedBy: [],
      rootModuleType: 'builtin',
    },
    {
      type: 'singleReexport',
      exportName: 'SourceCode',
      importName: 'SourceCode',
      importedBy: [],
      barrelImportedBy: [],
      externallyImportedBy: [],
      isEntryPoint: false,
      isExternallyImported: false,
      isTypeReexport: true,
      moduleSpecifier: 'eslint',
      resolvedModuleType: 'thirdParty',
      rootModuleType: 'thirdParty',
    },
  ],
  barrelReexports: [],
};

const EXPECTED_FILE_G: StrippedAnalyzedFileDetails = {
  hasEntryPoints: false,
  isExternallyImported: false,
  fileType: 'code',
  singleImports: [],
  barrelImports: [],
  dynamicImports: [],
  exports: [],
  singleReexports: [],
  barrelReexports: [
    {
      type: 'barrelReexport',
      moduleSpecifier: 'eslint',
      exportName: undefined,
      isEntryPoint: false,
      isExternallyImported: false,
      resolvedModuleType: 'thirdParty',
      importedBy: [],
      barrelImportedBy: [],
      externallyImportedBy: [],
    },
  ],
};

const EXPECTED_FILE_H: StrippedAnalyzedFileDetails = {
  fileType: 'other',
};

const EXPECTED_FILE_PACKAGE_JSON: StrippedAnalyzedFileDetails = {
  fileType: 'other',
};

const EXPECTED = {
  [FILE_A]: EXPECTED_FILE_A,
  [FILE_B]: EXPECTED_FILE_B,
  [FILE_C]: EXPECTED_FILE_C,
  [FILE_D]: EXPECTED_FILE_D,
  [FILE_E]: EXPECTED_FILE_E,
  [FILE_F]: EXPECTED_FILE_F,
  [FILE_G]: EXPECTED_FILE_G,
  [FILE_H]: EXPECTED_FILE_H,
  [FILE_PACKAGE_JSON]: EXPECTED_FILE_PACKAGE_JSON,
  [CYCLE_FILE_A]: EXPECTED_CYCLE_FILE_A,
  [CYCLE_FILE_B]: EXPECTED_CYCLE_FILE_B,
  [CYCLE_FILE_C]: EXPECTED_CYCLE_FILE_C,
};

it('Computes analyzed info', () => {
  const info = computeAnalyzedInfo(
    computeResolvedInfo(
      computeBaseInfo({
        packageRootDir: TEST_PROJECT_DIR,
        packageName: 'test',
        wildcardAliases: {},
        fixedAliases: {},
        ignorePatterns: [],
        ignoreOverridePatterns: [],
        isEntryPointCheck: (filePath) => filePath === FILE_A,
        isExternallyImportedCheck: () => false,
      })
    )
  );
  // This lookup gets two package.json files: this test and the root fast-import
  // package.json. We only look at the test project's dependencies in this test.
  expect(info.availableThirdPartyDependencies.size).toBe(2);
  expect(info.availableThirdPartyDependencies.get(TEST_PROJECT_DIR)).toEqual([
    'typescript',
  ]);

  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    statementNodeRange: _statementNodeRange,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    reportNodeRange: _reportNodeRange,
    ...rest
  } = Array.from(info.packageEntryPointExports.values())[0].exportEntry;
  expect(rest).toEqual(EXPECTED_FILE_A.singleReexports[0]);
  expect(info.packageName).toEqual('test');
  expect(info.packageRootDir).toEqual(TEST_PROJECT_DIR);
  expect(info).toMatchAnalyzedSpec(EXPECTED);
});

it('Computes analyzed info for a project with a file that imports itself', () => {
  const selfImportProjectDir = join(getDirname(), 'project', 'self-import');
  expect(() =>
    computeAnalyzedInfo(
      computeResolvedInfo(
        computeBaseInfo({
          packageRootDir: selfImportProjectDir,
          packageName: 'test',
          wildcardAliases: {},
          fixedAliases: {},
          ignorePatterns: [],
          ignoreOverridePatterns: [],
          isEntryPointCheck: () => false,
          isExternallyImportedCheck: () => false,
        })
      )
    )
  ).not.toThrow();
});

it('Computes analyzed info for a project with a reexport cycle triggered by an entry point', () => {
  const reexportCycleProjectDir = join(
    getDirname(),
    'project',
    'reexport-cycle'
  );
  const fileA = join(reexportCycleProjectDir, 'a.ts');
  expect(() =>
    computeAnalyzedInfo(
      computeResolvedInfo(
        computeBaseInfo({
          packageRootDir: reexportCycleProjectDir,
          packageName: 'test',
          wildcardAliases: {},
          fixedAliases: {},
          ignorePatterns: [],
          ignoreOverridePatterns: [],
          isEntryPointCheck: (filePath) => filePath === fileA,
          isExternallyImportedCheck: () => false,
        })
      )
    )
  ).not.toThrow();
});

it('Computes analyzed info for a project with a reexport cycle triggered by an import', () => {
  const reexportCycleProjectDir = join(
    getDirname(),
    'project',
    'reexport-cycle-import'
  );
  expect(() =>
    computeAnalyzedInfo(
      computeResolvedInfo(
        computeBaseInfo({
          packageRootDir: reexportCycleProjectDir,
          packageName: 'test',
          wildcardAliases: {},
          fixedAliases: {},
          ignorePatterns: [],
          ignoreOverridePatterns: [],
          isEntryPointCheck: () => false,
          isExternallyImportedCheck: () => false,
        })
      )
    )
  ).not.toThrow();
});

it('Computes analyzed info for a project with a single reexport of a firstPartyOther module', () => {
  const projectDir = join(getDirname(), 'project', 'single-reexport-of-other');
  expect(() =>
    computeAnalyzedInfo(
      computeResolvedInfo(
        computeBaseInfo({
          packageRootDir: projectDir,
          packageName: 'test',
          wildcardAliases: {},
          fixedAliases: {},
          ignorePatterns: [],
          ignoreOverridePatterns: [],
          isEntryPointCheck: () => false,
          isExternallyImportedCheck: () => false,
        })
      )
    )
  ).not.toThrow();
});

it('Computes analyzed info for a project with a named barrel reexport of a builtin module', () => {
  const projectDir = join(
    getDirname(),
    'project',
    'named-barrel-reexport-of-builtin'
  );
  expect(() =>
    computeAnalyzedInfo(
      computeResolvedInfo(
        computeBaseInfo({
          packageRootDir: projectDir,
          packageName: 'test',
          wildcardAliases: {},
          fixedAliases: {},
          ignorePatterns: [],
          ignoreOverridePatterns: [],
          isEntryPointCheck: () => false,
          isExternallyImportedCheck: () => false,
        })
      )
    )
  ).not.toThrow();
});

it('Computes analyzed info for a project with a named barrel reexport of a firstPartyOther module', () => {
  const projectDir = join(
    getDirname(),
    'project',
    'named-barrel-reexport-of-other'
  );
  expect(() =>
    computeAnalyzedInfo(
      computeResolvedInfo(
        computeBaseInfo({
          packageRootDir: projectDir,
          packageName: 'test',
          wildcardAliases: {},
          fixedAliases: {},
          ignorePatterns: [],
          ignoreOverridePatterns: [],
          isEntryPointCheck: () => false,
          isExternallyImportedCheck: () => false,
        })
      )
    )
  ).not.toThrow();
});

it('Computes analyzed info for a project with a dynamic import', () => {
  const projectDir = join(getDirname(), 'project', 'dynamic-import');
  expect(() =>
    computeAnalyzedInfo(
      computeResolvedInfo(
        computeBaseInfo({
          packageRootDir: projectDir,
          packageName: 'test',
          wildcardAliases: {},
          fixedAliases: {},
          ignorePatterns: [],
          ignoreOverridePatterns: [],
          isEntryPointCheck: () => false,
          isExternallyImportedCheck: () => false,
        })
      )
    )
  ).not.toThrow();
});

it('Computes analyzed info for a project with a barrel reexport that is an entry point and forms a cycle', () => {
  const projectDir = join(
    getDirname(),
    'project',
    'barrel-reexport-entry-point'
  );
  const fileA = join(projectDir, 'a.ts');
  expect(() =>
    computeAnalyzedInfo(
      computeResolvedInfo(
        computeBaseInfo({
          packageRootDir: projectDir,
          packageName: 'test',
          wildcardAliases: {},
          fixedAliases: {},
          ignorePatterns: [],
          ignoreOverridePatterns: [],
          isEntryPointCheck: (filePath) => filePath === fileA,
          isExternallyImportedCheck: () => false,
        })
      )
    )
  ).not.toThrow();
});
