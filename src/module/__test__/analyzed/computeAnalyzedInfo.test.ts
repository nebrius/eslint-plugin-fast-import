import { join } from 'path';
import { stripNodes } from '../util';
import { computeAnalyzedInfo } from '../../computeAnalyzedInfo';
import { computeResolvedInfo } from '../../computeResolvedInfo';
import { computeBaseInfo } from '../../computeBaseInfo';

const TEST_PROJECT_DIR = join(__dirname, 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'b.ts');
const FILE_C = join(TEST_PROJECT_DIR, 'c.ts');
const FILE_D = join(TEST_PROJECT_DIR, 'd.ts');
const FILE_E = join(TEST_PROJECT_DIR, 'e.ts');
const FILE_F = join(TEST_PROJECT_DIR, 'f.ts');
const FILE_G = join(TEST_PROJECT_DIR, 'g.ts');

it('Computes base info', () => {
  const info = computeAnalyzedInfo(
    computeResolvedInfo(
      computeBaseInfo({
        sourceRoot: TEST_PROJECT_DIR,
        rootImportAlias: '@',
        allowAliaslessRootImports: true,
        isEntryPointCheck: (filePath, symbolName) =>
          filePath === FILE_A && symbolName === 'ASourceCode',
      })
    )
  );
  expect(stripNodes(info)).toEqual({
    files: {
      [FILE_A]: {
        fileType: 'code',
        imports: [
          {
            importType: 'single',
            moduleSpecifier: './b',
            importName: 'c1',
            importAlias: 'c1',
            isTypeImport: false,
            moduleType: 'firstPartyCode',
            resolvedModulePath: FILE_B,
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_C,
            rootExportName: 'c1',
            rootExportType: 'export',
          },
          {
            importType: 'barrel',
            moduleSpecifier: './b',
            moduleType: 'firstPartyCode',
            resolvedModulePath: FILE_B,
          },
          {
            importType: 'single',
            moduleSpecifier: './e',
            importName: 'd1',
            importAlias: 'd1',
            isTypeImport: false,
            moduleType: 'firstPartyCode',
            resolvedModulePath: FILE_E,
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_D,
            rootExportName: 'd1',
            rootExportType: 'export',
          },
          {
            importType: 'single',
            moduleSpecifier: './e',
            importName: 'f',
            importAlias: 'f',
            isTypeImport: false,
            moduleType: 'firstPartyCode',
            resolvedModulePath: FILE_E,
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_E,
            rootExportName: 'f',
            rootExportType: 'namedBarrelReexport',
          },
          {
            importType: 'single',
            moduleSpecifier: './f',
            importName: 'join',
            importAlias: 'join',
            isTypeImport: false,
            moduleType: 'firstPartyCode',
            rootModuleType: 'builtin',
          },
          {
            importType: 'single',
            moduleSpecifier: './g',
            importName: 'SourceCode',
            importAlias: 'SourceCode',
            isTypeImport: false,
            moduleType: 'firstPartyCode',
            rootModuleType: 'thirdParty',
          },
        ],
        exports: [],
        reexports: [
          {
            barrelImportedByFiles: [],
            exportName: 'ASourceCode',
            importName: 'SourceCode',
            importedByFiles: [],
            isEntryPoint: true,
            isTypeReexport: true,
            moduleSpecifier: './f',
            moduleType: 'firstPartyCode',
            reexportType: 'single',
            rootModuleType: 'thirdParty',
          },
        ],
      },
      [FILE_B]: {
        fileType: 'code',
        imports: [],
        exports: [],
        reexports: [
          {
            reexportType: 'barrel',
            moduleSpecifier: './c',
            exportName: undefined,
            isTypeReexport: false,
            moduleType: 'firstPartyCode',
            resolvedModulePath: FILE_C,
            importedByFiles: [FILE_A],
            barrelImportedByFiles: [FILE_A],
          },
          {
            reexportType: 'barrel',
            moduleSpecifier: './d',
            exportName: undefined,
            isTypeReexport: false,
            moduleType: 'firstPartyCode',
            resolvedModulePath: FILE_D,
            importedByFiles: [],
            barrelImportedByFiles: [FILE_A],
          },
        ],
      },
      [FILE_C]: {
        fileType: 'code',
        imports: [],
        exports: [
          {
            exportName: 'c1',
            isEntryPoint: false,
            importedByFiles: [FILE_A],
            barrelImportedByFiles: [FILE_A],
            reexportedByFiles: [FILE_B],
          },
        ],
        reexports: [],
      },
      [FILE_D]: {
        fileType: 'code',
        imports: [],
        exports: [
          {
            exportName: 'd1',
            isEntryPoint: false,
            importedByFiles: [FILE_A],
            barrelImportedByFiles: [FILE_A],
            reexportedByFiles: [FILE_B, FILE_E],
          },
        ],
        reexports: [],
      },
      [FILE_E]: {
        fileType: 'code',
        imports: [],
        exports: [],
        reexports: [
          {
            reexportType: 'single',
            moduleSpecifier: './d',
            importName: 'd1',
            exportName: 'd1',
            isTypeReexport: false,
            isEntryPoint: false,
            moduleType: 'firstPartyCode',
            resolvedModulePath: FILE_D,
            importedByFiles: [FILE_A],
            barrelImportedByFiles: [],
            rootModuleType: 'firstPartyCode',
            rootModulePath: FILE_D,
            rootExportName: 'd1',
            rootExportType: 'export',
          },
          {
            reexportType: 'barrel',
            moduleSpecifier: './f',
            exportName: 'f',
            isTypeReexport: false,
            moduleType: 'firstPartyCode',
            resolvedModulePath: FILE_F,
            importedByFiles: [],
            barrelImportedByFiles: [],
          },
        ],
      },
      [FILE_F]: {
        fileType: 'code',
        imports: [],
        exports: [],
        reexports: [
          {
            reexportType: 'single',
            moduleSpecifier: 'path',
            importName: 'join',
            exportName: 'join',
            isTypeReexport: false,
            isEntryPoint: false,
            moduleType: 'builtin',
            importedByFiles: [],
            barrelImportedByFiles: [],
            rootModuleType: 'builtin',
          },
          {
            barrelImportedByFiles: [],
            exportName: 'SourceCode',
            importName: 'SourceCode',
            importedByFiles: [],
            isEntryPoint: false,
            isTypeReexport: true,
            moduleSpecifier: 'eslint',
            moduleType: 'thirdParty',
            reexportType: 'single',
            rootModuleType: 'thirdParty',
          },
        ],
      },
      [FILE_G]: {
        fileType: 'code',
        imports: [],
        exports: [],
        reexports: [
          {
            reexportType: 'barrel',
            moduleSpecifier: 'eslint',
            exportName: undefined,
            isTypeReexport: false,
            moduleType: 'thirdParty',
            importedByFiles: [],
            barrelImportedByFiles: [],
          },
        ],
      },
    },
    sourceRoot: TEST_PROJECT_DIR,
    rootImportAlias: '@',
    allowAliaslessRootImports: true,
  });
});
