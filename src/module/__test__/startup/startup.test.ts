import { join } from 'node:path';

import { parse } from '@typescript-eslint/typescript-estree';
import { getDirname } from 'cross-dirname';

import type { ParsedPackageSettings } from '../../../settings/settings.js';
import { getProjectInfo, initializeProject, updateCacheForFile } from '../../module.js';

function parseContents(contents: string) {
  return parse(contents, {
    loc: true,
    range: true,
    tokens: true,
    jsx: true,
  });
}

const SINGLEREPO_PROJECT_DIR = join(getDirname(), 'project');
const SINGLEREPO_FILE_A = join(SINGLEREPO_PROJECT_DIR, 'a.ts');

it('Updates cache when a new file is added', () => {
  const settings: ParsedPackageSettings = {
    repoRootDir: SINGLEREPO_PROJECT_DIR,
    packageRootDir: SINGLEREPO_PROJECT_DIR,
    packageName: 'test',
    wildcardAliases: {},
    fixedAliases: {},
    entryPoints: [],
    externallyImported: [],
    ignorePatterns: [],
    ignoreOverridePatterns: [],
    testFilePatterns: [],
  };
  initializeProject(settings);

  let projectInfo = getProjectInfo(SINGLEREPO_PROJECT_DIR);
  // a.ts on disk contains intentionally invalid syntax; it must be skipped
  // during startup and must not leak into projectInfo.files. This guards
  // against a past regression where a parse failure on startup would crash
  // the plugin or leave a half-populated entry behind.
  expect(projectInfo.files.has(SINGLEREPO_FILE_A)).toBe(false);
  expect(projectInfo.files.size).toBe(0);
  expect(projectInfo).toMatchAnalyzedSpec({});

  updateCacheForFile(
    SINGLEREPO_FILE_A,
    'export const a = 10;',
    parseContents('export const a = 10;'),
    settings
  );

  projectInfo = getProjectInfo(SINGLEREPO_PROJECT_DIR);
  expect(projectInfo).toMatchAnalyzedSpec({
    [SINGLEREPO_FILE_A]: {
      fileType: 'code',
      hasEntryPoints: false,
      hasExternallyImported: false,
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
          externallyImportedBy: [],
          isEntryPoint: false,
          isExternallyImported: false,
          isTypeExport: false,
        },
      ],
    },
  });
});
