import { getDirname } from 'cross-dirname';
import { join } from 'node:path';
import {
  getProjectInfo,
  initializeProject,
  updateCacheForFile,
} from '../../module.js';
import type { StrippedAnalyzedProjectInfo } from '../../../__test__/util.js';
import { stripNodesFromAnalyzedInfo } from '../../../__test__/util.js';
import { parse } from '@typescript-eslint/typescript-estree';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'b.ts');

const FILE_A_UPDATED_CONTENTS = `export type One = string;
export type Two = string;
`;

it('Updates cache when an unused export is added', () => {
  const settings = {
    rootDir: TEST_PROJECT_DIR,
    wildcardAliases: {},
    fixedAliases: {},
    entryPoints: [],
    ignorePatterns: [],
    mode: 'fix' as const,
    editorUpdateRate: 5_000,
  };
  initializeProject(settings);

  let projectInfo = getProjectInfo();
  const expected1: StrippedAnalyzedProjectInfo = {
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
  expect(stripNodesFromAnalyzedInfo(projectInfo)).toEqual(expected1);

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
