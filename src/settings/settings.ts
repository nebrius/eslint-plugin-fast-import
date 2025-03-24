import { z } from 'zod';
import type { RequiredDeep } from 'type-fest';
import { getTypeScriptSettings } from './typescript';
import { error } from '../util/logging';
import type { GenericContext } from '../types/context';
import { isAbsolute, join, resolve } from 'node:path';

// TODO: need better support of relative vs absolute paths supplied by users

const settingsSchema = z.strictObject({
  rootDir: z.string().optional(),
  paths: z.record(z.string(), z.string()).optional(),
  allowAliaslessRootImports: z.boolean().optional(),
  entryPoints: z
    .array(
      z.strictObject({
        file: z.string(),
        symbol: z.string(),
      })
    )
    .optional(),
});

export type Settings = z.infer<typeof settingsSchema>;
type ParsedSettings = RequiredDeep<Settings>;

let settings: ParsedSettings | null = null;
export function getSettings(context: GenericContext): ParsedSettings {
  // Return the cached copy if we have it
  if (settings) {
    return settings;
  }

  // Parse the raw settings, if supplied
  const fastEsmSettings = context.settings['fast-esm'];
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
    error('Invalid settings:\n' + issues.join('\n'));
    process.exit(-1);
  }

  // Get TypeScript supplied settings
  const typeScriptSettings = getTypeScriptSettings(context);

  // Get user supplied settings
  const userSettings = parseResult.data;

  const mergedSettings = {
    ...typeScriptSettings,
    ...userSettings,
  };

  let { rootDir } = mergedSettings;
  const { paths = {}, allowAliaslessRootImports, entryPoints } = mergedSettings;

  if (!rootDir) {
    error(`rootDir must be specified in tsconfig.json or in fast-esm settings`);
    process.exit(-1);
  }

  // Trim off the end `/` in case it was supplied
  if (rootDir.endsWith('/')) {
    rootDir = rootDir.substring(0, rootDir.length - 1);
  }

  // Make sure rootDir is absolute
  if (!isAbsolute(rootDir)) {
    throw new Error(`rootDir "${rootDir}" must be absolute`);
  }

  // Slice off any trailing commas in path and validate alias paths
  const parsedPaths: Record<string, string> = {};
  for (let [alias, path] of Object.entries(paths)) {
    if (alias.endsWith('/')) {
      alias = alias.slice(0, -1);
    }
    if (!path.startsWith('./')) {
      error(`Invalid alias path "${path}". Alias paths must start with "./"`);
      process.exit(-1);
    }
    path = resolve(join(rootDir, path));
    parsedPaths[alias] = path;
  }

  // Apply defaults and save to the cache
  settings = {
    rootDir,
    paths,
    allowAliaslessRootImports: allowAliaslessRootImports ?? false,
    entryPoints: entryPoints ?? [],
  };
  return settings;
}
