import { z } from 'zod';
import type { RequiredDeep } from 'type-fest';
import { getTypeScriptSettings } from './typescript';
import { error } from '../util/logging';
import type { GenericContext } from '../types/context';

// TODO: need better support of relative vs absolute paths supplied by users

// TODO: replace singleton rootImportAlias with generic alias dictionary

const settingsSchema = z.strictObject({
  rootDir: z.string().optional(),
  rootImportAlias: z.string().optional(),
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
type ParsedSettings = RequiredDeep<Omit<Settings, 'rootImportAlias'>> &
  Pick<Settings, 'rootImportAlias'>;

let settings: ParsedSettings | null = null;
export function getSettings(context: GenericContext): ParsedSettings {
  // Return the cached copy if we have it
  if (settings) {
    return settings;
  }

  // Parse the raw settings, if supplied
  const fastEsmSettings = context.settings['fast-esm'];
  if (!fastEsmSettings) {
    throw new Error(`fast-esm settings are required`);
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
    throw new Error('Invalid fast-esm settings:\n' + issues.join('\n'));
  }

  // Get TypeScript supplied settings
  const typeScriptSettings = getTypeScriptSettings(context);

  // Get user supplied settings
  const userSettings = parseResult.data;

  const { rootDir, rootImportAlias, allowAliaslessRootImports, entryPoints } = {
    ...typeScriptSettings,
    ...userSettings,
  };

  if (!rootDir) {
    error(`rootDir must be specified in tsconfig.json or in fast-esm settings`);
    process.exit(-1);
  }

  // Apply defaults and save to the cache
  settings = {
    rootDir,
    rootImportAlias,
    allowAliaslessRootImports: allowAliaslessRootImports ?? false,
    entryPoints: entryPoints ?? [],
  };
  return settings;
}
