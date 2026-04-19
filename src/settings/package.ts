import { existsSync, readFileSync } from 'node:fs';

type PackageJsonSettings = { packageName: string | undefined };

export function getPackageJsonSettings(packageRootDir: string): PackageJsonSettings {
  const packageJsonPath = `${packageRootDir}/package.json`;
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      name?: string;
    };
    return { packageName: packageJson.name };
  }
  return { packageName: undefined };
}
