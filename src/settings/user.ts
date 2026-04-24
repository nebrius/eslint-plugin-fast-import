import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';

import { parse, printParseErrorCode } from 'jsonc-parser';
import { z, type ZodError } from 'zod';

import type { GenericContext } from '../types/context.js';
import { trimTrailingPathSeparator } from '../util/files.js';
import { setVerbose } from '../util/logging.js';

const globalSettingsSchema = z.strictObject({
  mode: z.enum(['auto', 'one-shot', 'fix', 'editor']).optional(),
  editorUpdateRate: z.number().optional(),
  debugLogging: z.boolean().optional(),
});

const packageSettingsSchema = z.strictObject({
  alias: z.record(z.string(), z.string()).optional(),
  entryPointFiles: z.record(z.string(), z.string()).optional(),
  externallyImportedFiles: z.array(z.string()).optional(),
  ignorePatterns: z.array(z.string()).optional(),
  ignoreOverridePatterns: z.array(z.string()).optional(),
  testFilePatterns: z.array(z.string()).optional(),
});

const singleRepoSettingsSchema = z.strictObject({
  packageRootDir: z.string(),
  ...globalSettingsSchema.shape,
  ...packageSettingsSchema.shape,
});

const monorepoPackageSettingsSchema = z.strictObject({
  monorepoRootDir: z.string(),
  ...globalSettingsSchema.shape,
});

export type PackageSettings = z.infer<typeof packageSettingsSchema> & {
  repoRootDir: string;
  packageRootDir: string;
};

type BaseRepoUserSettings = {
  mode: 'auto' | 'one-shot' | 'fix' | 'editor' | undefined;
  editorUpdateRate: number | undefined;
  repoRootDir: string;
};

type SingleRepoUserSettings = BaseRepoUserSettings & {
  type: 'singlerepo';
  packageSettings: PackageSettings;
};

type MonorepoUserSettings = BaseRepoUserSettings & {
  type: 'monorepo';
};

export type RepoUserSettings = SingleRepoUserSettings | MonorepoUserSettings;

// If there were errors, print a friendly-ish explanation of them
function formatErrors(error: ZodError): never {
  const issues: string[] = [];
  for (const issue of error.issues) {
    let formattedIssue = issue.code.replace('_', ' ');
    formattedIssue = `  ${formattedIssue[0].toUpperCase() + formattedIssue.slice(1)}`;
    if (issue.path.length) {
      formattedIssue += ` for property "${issue.path.join('.')}"\n`;
    } else {
      formattedIssue += '\n';
    }
    for (const [key, value] of Object.entries(issue)) {
      if (key !== 'code' && key !== 'path') {
        formattedIssue += `    ${key}: ${String(value)}\n`;
      }
    }
    issues.push(formattedIssue);
  }
  throw new Error('Invalid settings:\n' + issues.join('\n'));
}

export function getUserRepoSettings(
  settings: GenericContext['settings'] | undefined
): RepoUserSettings {
  // Parse the raw settings, if supplied
  const fastEsmSettings = settings?.['fast-import'];
  if (!fastEsmSettings) {
    throw new Error(
      `eslint-plugin-fast-import settings are required in your ESLint/Oxlint config file`
    );
  }

  // Check if this is a monorepo configuration
  if (
    typeof fastEsmSettings === 'object' &&
    'monorepoRootDir' in fastEsmSettings
  ) {
    const parseResult =
      monorepoPackageSettingsSchema.safeParse(fastEsmSettings);
    if (!parseResult.success) {
      formatErrors(parseResult.error);
    }

    // Split props apart so we can recombine them in the standardized format
    const { debugLogging, mode, editorUpdateRate, monorepoRootDir } =
      parseResult.data;

    // Validate monorepoRootDir exists
    if (!isAbsolute(monorepoRootDir)) {
      throw new Error(`monorepoRootDir "${monorepoRootDir}" must be absolute`);
    } else if (!existsSync(monorepoRootDir)) {
      throw new Error(`monorepoRootDir "${monorepoRootDir}" does not exist`);
    }

    // Trim off the end `/` in case it was supplied
    const trimmedMonorepoRootDir = trimTrailingPathSeparator(monorepoRootDir);

    // Set verbose logging, if enabled
    setVerbose(!!debugLogging);

    // Return formatted user supplied settings, minus debug logging
    return {
      type: 'monorepo',
      mode,
      editorUpdateRate,
      repoRootDir: trimmedMonorepoRootDir,
    };
  } else {
    const parseResult = singleRepoSettingsSchema.safeParse(fastEsmSettings);
    if (!parseResult.success) {
      formatErrors(parseResult.error);
    }

    // Split props apart so we can recombine them in the standardized format
    const {
      debugLogging,
      mode,
      editorUpdateRate,
      packageRootDir,
      ...packageSettings
    } = parseResult.data;

    // Validate packageRootDir exists
    if (!isAbsolute(packageRootDir)) {
      throw new Error(`packageRootDir "${packageRootDir}" must be absolute`);
    } else if (!existsSync(packageRootDir)) {
      throw new Error(`packageRootDir "${packageRootDir}" does not exist`);
    }

    // Trim off the end `/` in case it was supplied
    const trimmedPackageRootDir = trimTrailingPathSeparator(packageRootDir);

    // Set verbose logging, if enabled
    setVerbose(!!debugLogging);

    // Return formatted user supplied settings, minus debug logging
    return {
      type: 'singlerepo',
      mode,
      editorUpdateRate,
      repoRootDir: trimmedPackageRootDir,
      packageSettings: {
        ...packageSettings,
        repoRootDir: trimmedPackageRootDir,
        packageRootDir: trimmedPackageRootDir,
      },
    };
  }
}

export function getUserPackageSettingsFromConfigFile({
  configFilePath,
  repoRootDir,
}: {
  repoRootDir: string;
  configFilePath: string;
}): PackageSettings {
  const configContent = readFileSync(configFilePath, 'utf-8');

  // Read the config file. jsonc-parser's parse() does not throw on malformed
  // input — it returns a best-effort partial result and reports issues via
  // the errors out-parameter, so we surface those manually.
  const errors: Array<{ error: number; offset: number; length: number }> = [];
  const config: unknown = parse(configContent, errors, {
    allowTrailingComma: true,
  });
  if (errors.length > 0) {
    const formatted = errors
      .map(
        (e) => `${printParseErrorCode(e.error)} at offset ${String(e.offset)}`
      )
      .join(', ');
    throw new Error(
      `Failed to parse package config file ${configFilePath}: ${formatted}`
    );
  }

  // Parse and return the results
  const parseResult = packageSettingsSchema.safeParse(config);
  if (!parseResult.success) {
    formatErrors(parseResult.error);
  }
  return {
    ...parseResult.data,
    repoRootDir,
    packageRootDir: dirname(configFilePath),
  };
}
