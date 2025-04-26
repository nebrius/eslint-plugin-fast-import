import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';

import { z } from 'zod';

import type { GenericContext } from '../types/context.js';
import { trimTrailingPathSeparator } from '../util/files.js';
import { setVerbose } from '../util/logging.js';

const settingsSchema = z.strictObject({
  rootDir: z.string(),
  alias: z.record(z.string(), z.string()).optional(),
  entryPoints: z.record(z.string(), z.array(z.string())).optional(),
  ignorePatterns: z.array(z.string()).optional(),
  mode: z.enum(['auto', 'one-shot', 'fix', 'editor']).optional(),
  editorUpdateRate: z.number().optional(),
  debugLogging: z.boolean().optional(),
});

export type UserSettings = z.infer<typeof settingsSchema>;

export type Settings = Omit<UserSettings, 'debugLogging'>;

export function getUserSettings(
  settings: GenericContext['settings'] | undefined
): Settings {
  // Parse the raw settings, if supplied
  const fastEsmSettings = settings?.['fast-import'];
  if (!fastEsmSettings) {
    throw new Error(
      `eslint-plugin-fast-import settings are required in your ESLint config file`
    );
  }
  const parseResult = settingsSchema.safeParse(fastEsmSettings);

  // If there were errors, print a friendly-ish explanation of them
  if (!parseResult.success) {
    const issues: string[] = [];
    for (const issue of parseResult.error.issues) {
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

  // Validate rootDir exists
  if (!isAbsolute(parseResult.data.rootDir)) {
    throw new Error(`rootDir "${parseResult.data.rootDir}" must be absolute`);
  } else if (!existsSync(parseResult.data.rootDir)) {
    throw new Error(`rootDir "${parseResult.data.rootDir}" does not exist`);
  }

  // Trim off the end `/` in case it was supplied with rootDir
  parseResult.data.rootDir = trimTrailingPathSeparator(
    parseResult.data.rootDir
  );

  // Set verbose logging, if enabled
  setVerbose(!!parseResult.data.debugLogging);

  // Get user supplied settings
  return parseResult.data;
}
