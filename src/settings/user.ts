import { z } from 'zod';
import type { GenericContext } from '../types/context.js';
import { setVerbose } from '../util/logging.js';

const settingsSchema = z.strictObject({
  rootDir: z.string().optional(),
  alias: z.record(z.string(), z.string()).optional(),
  entryPoints: z
    .array(
      z.strictObject({
        file: z.string(),
        symbol: z.string(),
      })
    )
    .optional(),
  ignorePatterns: z.array(z.string()).optional(),
  mode: z.enum(['auto', 'one-shot', 'fix', 'editor']).optional(),
  editorUpdateRate: z.number().optional(),
  debugLogging: z.boolean().optional(),
});

export type Settings = Omit<z.infer<typeof settingsSchema>, 'debugLogging'>;

export function getUserSettings(
  settings: GenericContext['settings']
): Settings {
  // Parse the raw settings, if supplied
  const fastEsmSettings = settings['fast-import'];
  if (!fastEsmSettings) {
    return {};
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

  // Trim off the end `/` in case it was supplied with rootDir
  if (parseResult.data.rootDir?.endsWith('/')) {
    parseResult.data.rootDir = parseResult.data.rootDir.substring(
      0,
      parseResult.data.rootDir.length - 1
    );
  }

  // Set verbose logging, if enabled
  setVerbose(!!parseResult.data.debugLogging);

  // Get user supplied settings
  return parseResult.data;
}
