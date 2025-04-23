import { join } from 'node:path';

import { parse } from '@typescript-eslint/typescript-estree';
import { getDirname } from 'cross-dirname';

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
  expect(projectInfo).toMatchAnalyzedSpec({});

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
  expect(projectInfo).toMatchAnalyzedSpec({
    [FILE_A]: {
      fileType: 'code',
      hasEntryPoints: false,
      singleImports: [],
      barrelImports: [],
      dynamicImports: [],
      singleReexports: [],
      barrelReexports: [],
      exports: [
        {
          type: 'export',
          barrelImportedBy: [],
          exportName: 'a',
          importedBy: [],
          isEntryPoint: false,
          isTypeExport: false,
        },
      ],
    },
  });
});
