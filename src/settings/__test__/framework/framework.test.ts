import { join } from 'node:path';

import type { ParsedPackageSettings } from '../../settings.js';
import { getAllPackageSettings } from '../../settings.js';
import type { PackageSettings } from '../../user.js';

const PROJECTS_DIR = join(import.meta.dirname, 'project');

function getPackageSettings(
  fixtureName: string,
  extraSettings: Partial<PackageSettings> = {}
): ParsedPackageSettings {
  const fixtureDir = join(PROJECTS_DIR, fixtureName);
  const { packageSettings } = getAllPackageSettings({
    filename: join(fixtureDir, 'package.json'),
    settings: {
      'import-integrity': {
        mode: 'one-shot',
        packageRootDir: fixtureDir,
        ...extraSettings,
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

it('Merges user-supplied externallyImportedFiles with framework-inferred patterns', () => {
  const settings = getPackageSettings('appRouter', {
    externallyImportedFiles: ['src/scripts/build.ts'],
  });

  // User-supplied pattern is preserved.
  expect(isMatched(settings, 'src/scripts/build.ts')).toBe(true);

  // Framework-inferred Next.js patterns still apply.
  expect(isMatched(settings, 'app/page.tsx')).toBe(true);
  expect(isMatched(settings, 'middleware.ts')).toBe(true);

  // The always-on config-files pattern still applies.
  expect(isMatched(settings, 'eslint.config.mjs')).toBe(true);

  // Unrelated files still do not match.
  expect(isMatched(settings, 'lib/utils.ts')).toBe(false);
});
