import { join } from 'node:path';

import { parse } from '@typescript-eslint/typescript-estree';
import { getDirname } from 'cross-dirname';

import type { StrippedAnalyzedProjectInfo } from '../../../__test__/util.js';
import { stripNodesFromAnalyzedInfo } from '../../../__test__/util.js';
import {
  getProjectInfo,
  initializeProject,
  updateCacheForFile,
} from '../../module.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');

it('Updates cache when a new file is added', () => {
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
  let expected: StrippedAnalyzedProjectInfo = {
    files: new Map(),
    rootDir: TEST_PROJECT_DIR,
    wildcardAliases: {},
    fixedAliases: {},
    availableThirdPartyDependencies: new Map(),
  };
  expect(stripNodesFromAnalyzedInfo(projectInfo)).toEqual(expected);

  updateCacheForFile(
    FILE_A,
    'export const a = 10;',
    parse('export const a = 10;', {
      loc: true,
      range: true,
      tokens: true,
      jsx: true,
    }),
    settings
  );

  projectInfo = getProjectInfo();
  expected = {
    files: new Map([
      [
        FILE_A,
        {
          fileType: 'code',
          singleImports: [],
          barrelImports: [],
          dynamicImports: [],
          singleReexports: [],
          barrelReexports: [],
          exports: [
            {
              id: 0,
              type: 'export',
              barrelImportedByFiles: [],
              exportName: 'a',
              importedByFiles: [],
              isEntryPoint: false,
              isTypeExport: false,
            },
          ],
        },
      ],
    ]),
    rootDir: TEST_PROJECT_DIR,
    wildcardAliases: {},
    fixedAliases: {},
    availableThirdPartyDependencies: new Map(),
  };
  expect(stripNodesFromAnalyzedInfo(projectInfo)).toEqual(expected);
});
