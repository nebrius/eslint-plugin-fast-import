// This function attempts to detect common frameworks that need an externally

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { debug } from '../util/logging.js';

function addExtensions(mappings: [string, string[]][]) {
  return mappings.flatMap(([file, extensions]) => {
    return extensions.map((ext) => file + '.' + ext);
  });
}

const CONFIG_EXTENSIONS = ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts'];
const REACT_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx'];

const NEXT_JS_APP_ROUTER_EXTERNALLY_IMPORTED_FILES = addExtensions([
  // App router special files (UI)
  ['/app/**/page', REACT_EXTENSIONS],
  ['/app/**/layout', REACT_EXTENSIONS],
  ['/app/**/template', REACT_EXTENSIONS],
  ['/app/**/loading', REACT_EXTENSIONS],
  ['/app/**/error', REACT_EXTENSIONS],
  ['/app/**/global-error', REACT_EXTENSIONS],
  ['/app/**/not-found', REACT_EXTENSIONS],
  ['/app/**/forbidden', REACT_EXTENSIONS],
  ['/app/**/unauthorized', REACT_EXTENSIONS],
  ['/app/**/default', REACT_EXTENSIONS],
  // Route handlers
  ['/app/**/route', REACT_EXTENSIONS],
  // App router metadata files (dynamic variants)
  ['/app/**/icon', REACT_EXTENSIONS],
  ['/app/**/apple-icon', REACT_EXTENSIONS],
  ['/app/**/opengraph-image', REACT_EXTENSIONS],
  ['/app/**/twitter-image', REACT_EXTENSIONS],
  ['/app/**/sitemap', REACT_EXTENSIONS],
  ['/app/**/robots', REACT_EXTENSIONS],
  ['/app/**/manifest', REACT_EXTENSIONS],
  // Top-level entry points. Next looks for these at either the project
  // root or under src/, which the caller handles via the src/ prefix.
  ['/middleware', REACT_EXTENSIONS],
  ['/instrumentation', REACT_EXTENSIONS],
  ['/instrumentation-client', REACT_EXTENSIONS],
  // Required by @next/mdx with the App Router; lives at project root or under src/.
  ['/mdx-components', REACT_EXTENSIONS],
]);

const NEXT_JS_PAGES_ROUTER_EXTERNALLY_IMPORTED_FILES = addExtensions([
  // Pages router
  ['/pages/**/*', REACT_EXTENSIONS],
  // Top-level entry points. Next looks for these at either the project
  // root or under src/, which the caller handles via the src/ prefix.
  ['/middleware', REACT_EXTENSIONS],
  ['/instrumentation', REACT_EXTENSIONS],
  ['/instrumentation-client', REACT_EXTENSIONS],
]);

const FRAMEWORKS = [
  {
    name: 'Next.js',
    configFiles: addExtensions([['next.config', CONFIG_EXTENSIONS]]),
    getExternallyImportedFiles(packageRootDir: string) {
      // Detect Next's "src layout" specifically by the presence of src/app or
      // src/pages, mirroring Next.js's own loader. A bare src/ folder used for
      // unrelated source files should not trigger src-dir prefixing.
      const hasRootApp = existsSync(join(packageRootDir, 'app'));
      const hasSrcApp = existsSync(join(packageRootDir, 'src', 'app'));
      const hasSrcPages = existsSync(join(packageRootDir, 'src', 'pages'));
      const files =
        hasRootApp || hasSrcApp
          ? NEXT_JS_APP_ROUTER_EXTERNALLY_IMPORTED_FILES
          : NEXT_JS_PAGES_ROUTER_EXTERNALLY_IMPORTED_FILES;
      const prefix = hasSrcApp || hasSrcPages ? '/src' : '';
      return files.map((f) => prefix + f);
    },
  },
];

// Attempts to detect common frameworks that need an externally
// imported files entry, and supplies them
export function getFrameworkSettings(packageRootDir: string) {
  const directoryFiles = readdirSync(packageRootDir);
  for (const framework of FRAMEWORKS) {
    let isMatch = false;
    for (const configFile of framework.configFiles) {
      if (directoryFiles.includes(configFile)) {
        isMatch = true;
        break;
      }
    }
    if (isMatch) {
      debug(`Applying ${framework.name} externally imported files`);
      return {
        externallyImportedFiles:
          framework.getExternallyImportedFiles(packageRootDir),
      };
    }
  }
  return undefined;
}
