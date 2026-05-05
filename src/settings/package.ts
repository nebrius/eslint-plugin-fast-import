import { existsSync, readFileSync } from 'node:fs';

import { warn } from '../util/logging.js';

type PackageJsonSettings = {
  packageName: string | undefined;

  // This is a normalized form of package.json "exports". Notably, it collapses
  // conditional exports into a single entry using a heuristic
  exports: Record<string, string> | undefined;
};

export function getPackageJsonSettings(
  packageRootDir: string
): PackageJsonSettings {
  const packageJsonPath = `${packageRootDir}/package.json`;
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      name?: string;
      exports?: Record<string, string | Record<string, string>>;
      main?: string;
    };
    let parsedExports: Record<string, string> | undefined;
    if (packageJson.exports) {
      parsedExports = {};
      for (const [key, value] of Object.entries(packageJson.exports)) {
        if (typeof value === 'string') {
          parsedExports[key] = value;
          continue;
        }
        // For conditional exports, we follow the same precedence that Node.js
        // uses as documented at https://nodejs.org/api/packages.html#conditional-exports
        // This intentionally excludes other conditions, such as "types".
        if (typeof value['node-addons'] === 'string') {
          parsedExports[key] = value['node-addons'];
        } else if (typeof value.node === 'string') {
          parsedExports[key] = value.node;
        } else if (typeof value.import === 'string') {
          parsedExports[key] = value.import;
        } else if (typeof value.require === 'string') {
          parsedExports[key] = value.require;
        } else if (typeof value['module-sync'] === 'string') {
          parsedExports[key] = value['module-sync'];
        } else if (typeof value.default === 'string') {
          parsedExports[key] = value.default;
        } else {
          warn(
            `Could not identify a valid condition for export "${key}". Got ${Object.keys(value).join(', ')} but expected a known Node.js condition`
          );
        }
      }
    }

    // Fall back to "main" if no exports are defined for the root subpath
    if (packageJson.main) {
      // unlike "exports", "main" is not required to start with `./`
      if (!packageJson.main.startsWith('./')) {
        packageJson.main = `./${packageJson.main}`;
      }
      parsedExports = {
        // We set the main entry first so that packages.exports takes precedence
        // if it also defines a "." entry
        '.': packageJson.main,
        ...parsedExports,
      };
    }

    return { packageName: packageJson.name, exports: parsedExports };
  }
  return { packageName: undefined, exports: undefined };
}
