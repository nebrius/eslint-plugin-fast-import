import { join } from 'path';
import { stripNodes } from '../util';
import { computeAnalyzedInfo } from '../../computeAnalyzedInfo';
import { computeResolvedInfo } from '../../computeResolvedInfo';
import { computeBaseInfo } from '../../computeBaseInfo';
import { getDirname } from 'cross-dirname';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'b.ts');
const FILE_C = join(TEST_PROJECT_DIR, 'c.ts');
const FILE_D = join(TEST_PROJECT_DIR, 'd.ts');
const FILE_E = join(TEST_PROJECT_DIR, 'e.ts');
const FILE_F = join(TEST_PROJECT_DIR, 'f.ts');
const FILE_G = join(TEST_PROJECT_DIR, 'g.ts');

const CIRCULAR_FILE_A = join(TEST_PROJECT_DIR, 'circular-a.js');
const CIRCULAR_FILE_B = join(TEST_PROJECT_DIR, 'circular-b.js');
const CIRCULAR_FILE_C = join(TEST_PROJECT_DIR, 'circular-c.js');

it('Computes base info', () => {
  const info = computeAnalyzedInfo(
    computeResolvedInfo(
      computeBaseInfo({
        rootDir: TEST_PROJECT_DIR,
        alias: { '@': './' },
        allowAliaslessRootImports: true,
        isEntryPointCheck: (filePath, symbolName) =>
          filePath === FILE_A && symbolName === 'ASourceCode',
      })
    )
  );
  expect(stripNodes(info)).toEqual({
    files: new Map([
      [
        FILE_A,
        {
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
              importAlias: 'b',
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
              resolvedModulePath: FILE_F,
              isTypeImport: false,
              moduleType: 'firstPartyCode',
              rootModuleType: 'builtin',
            },
            {
              importType: 'single',
              moduleSpecifier: './g',
              importName: 'SourceCode',
              importAlias: 'SourceCode',
              resolvedModulePath: FILE_G,
              isTypeImport: false,
              moduleType: 'firstPartyCode',
              rootModuleType: undefined,
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
              resolvedModulePath: FILE_F,
              reexportType: 'single',
              rootModuleType: 'thirdParty',
            },
          ],
        },
      ],
      [
        FILE_B,
        {
          fileType: 'code',
          imports: [],
          exports: [],
          reexports: [
            {
              reexportType: 'barrel',
              moduleSpecifier: './c',
              exportName: undefined,
              isEntryPoint: false,
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
              isEntryPoint: false,
              isTypeReexport: false,
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_D,
              importedByFiles: [],
              barrelImportedByFiles: [FILE_A],
            },
          ],
        },
      ],
      [
        FILE_C,
        {
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
      ],
      [
        CIRCULAR_FILE_A,
        {
          exports: [],
          fileType: 'code',
          imports: [],
          reexports: [
            {
              barrelImportedByFiles: [],
              exportName: 'a',
              importName: 'a',
              importedByFiles: [],
              isEntryPoint: false,
              isTypeReexport: false,
              moduleSpecifier: './circular-b',
              moduleType: 'firstPartyCode',
              reexportType: 'single',
              resolvedModulePath: CIRCULAR_FILE_B,
              rootModuleType: undefined,
            },
          ],
        },
      ],
      [
        CIRCULAR_FILE_B,
        {
          exports: [],
          fileType: 'code',
          imports: [],
          reexports: [
            {
              barrelImportedByFiles: [],
              exportName: 'a',
              importName: 'a',
              importedByFiles: [],
              isEntryPoint: false,
              isTypeReexport: false,
              moduleSpecifier: './circular-c',
              moduleType: 'firstPartyCode',
              reexportType: 'single',
              resolvedModulePath: CIRCULAR_FILE_C,
              rootModuleType: undefined,
            },
          ],
        },
      ],
      [
        CIRCULAR_FILE_C,
        {
          exports: [],
          fileType: 'code',
          imports: [],
          reexports: [
            {
              barrelImportedByFiles: [],
              exportName: 'a',
              importName: 'a',
              importedByFiles: [],
              isEntryPoint: false,
              isTypeReexport: false,
              moduleSpecifier: './circular-a',
              moduleType: 'firstPartyCode',
              reexportType: 'single',
              resolvedModulePath: CIRCULAR_FILE_A,
              rootModuleType: undefined,
            },
          ],
        },
      ],
      [
        FILE_D,
        {
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
      ],
      [
        FILE_E,
        {
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
              isEntryPoint: false,
              isTypeReexport: false,
              moduleType: 'firstPartyCode',
              resolvedModulePath: FILE_F,
              importedByFiles: [],
              barrelImportedByFiles: [],
            },
          ],
        },
      ],
      [
        FILE_F,
        {
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
      ],
      [
        FILE_G,
        {
          fileType: 'code',
          imports: [],
          exports: [],
          reexports: [
            {
              reexportType: 'barrel',
              moduleSpecifier: 'eslint',
              exportName: undefined,
              isEntryPoint: false,
              isTypeReexport: false,
              moduleType: 'thirdParty',
              importedByFiles: [],
              barrelImportedByFiles: [],
            },
          ],
        },
      ],
    ]),
    rootDir: TEST_PROJECT_DIR,
    alias: { '@': './' },
    allowAliaslessRootImports: true,
  });
});
