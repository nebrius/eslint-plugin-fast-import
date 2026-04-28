import { join } from 'node:path';

import { getDirname } from 'cross-dirname';

import type { ParsedPackageSettings } from '../../settings.js';
import { getAllPackageSettings } from '../../settings.js';

const PROJECTS_DIR = join(getDirname(), 'project');

function getPackageSettings(fixtureName: string): ParsedPackageSettings {
  const fixtureDir = join(PROJECTS_DIR, fixtureName);
  const { packageSettings } = getAllPackageSettings({
    filename: join(fixtureDir, 'package.json'),
    settings: {
      'fast-import': {
        mode: 'one-shot',
        packageRootDir: fixtureDir,
      },
    },
  });
  if (!packageSettings) {
    throw new Error(`packageSettings not found for ${fixtureName}`);
  }
  return packageSettings;
}

// Mirrors getIsExternallyImportedCheck in module.ts: a file is externally
// imported iff any of the compiled matchers matches its (bare relative,
// unix-style) path. Tests run on macOS/Linux so no slash conversion is needed.
function isMatched(settings: ParsedPackageSettings, relPath: string): boolean {
  return settings.externallyImported.some(({ file }) => file.ignores(relPath));
}

it('Detects Next.js App Router at the project root', () => {
  const settings = getPackageSettings('appRouter');

  expect(isMatched(settings, 'app/page.tsx')).toBe(true);
  expect(isMatched(settings, 'app/layout.tsx')).toBe(true);
  expect(isMatched(settings, 'app/api/users/route.ts')).toBe(true);
  expect(isMatched(settings, 'middleware.ts')).toBe(true);

  expect(isMatched(settings, 'lib/utils.ts')).toBe(false);
});

it('Detects Next.js App Router under src/', () => {
  const settings = getPackageSettings('appRouterSrc');

  expect(isMatched(settings, 'src/app/page.tsx')).toBe(true);
  expect(isMatched(settings, 'src/app/layout.tsx')).toBe(true);
  expect(isMatched(settings, 'src/middleware.ts')).toBe(true);

  expect(isMatched(settings, 'src/lib/utils.ts')).toBe(false);
  // Root-level patterns should not match when the project uses the src layout.
  expect(isMatched(settings, 'app/page.tsx')).toBe(false);
  expect(isMatched(settings, 'middleware.ts')).toBe(false);
});

it('Detects Next.js Pages Router at the project root', () => {
  const settings = getPackageSettings('pagesRouter');

  expect(isMatched(settings, 'pages/index.tsx')).toBe(true);
  expect(isMatched(settings, 'pages/about.tsx')).toBe(true);
  expect(isMatched(settings, 'pages/api/hello.ts')).toBe(true);
  expect(isMatched(settings, 'middleware.ts')).toBe(true);

  expect(isMatched(settings, 'lib/utils.ts')).toBe(false);
  // App Router-only patterns should not be active for a Pages Router project.
  expect(isMatched(settings, 'app/page.tsx')).toBe(false);
});

it('Detects Next.js Pages Router under src/', () => {
  const settings = getPackageSettings('pagesRouterSrc');

  expect(isMatched(settings, 'src/pages/index.tsx')).toBe(true);
  expect(isMatched(settings, 'src/pages/api/hello.ts')).toBe(true);

  expect(isMatched(settings, 'src/lib/utils.ts')).toBe(false);
  expect(isMatched(settings, 'pages/index.tsx')).toBe(false);
});

it('App Router takes precedence when app/ and pages/ coexist', () => {
  const settings = getPackageSettings('mixed');

  // App Router-only pattern — would not be present under the Pages Router set.
  expect(isMatched(settings, 'app/page.tsx')).toBe(true);

  // The App Router list excludes pages/**/*, so legacy pages should not match.
  expect(isMatched(settings, 'pages/legacy.tsx')).toBe(false);

  expect(isMatched(settings, 'lib/utils.ts')).toBe(false);
});
