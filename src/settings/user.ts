import { z } from 'zod';
import type { GenericContext } from '../types/context';
import { error } from '../util/logging';

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

export function getUserSettings(context: GenericContext): Settings {
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

  // Trim off the end `/` in case it was supplied
  if (parseResult.data.rootDir?.endsWith('/')) {
    parseResult.data.rootDir = parseResult.data.rootDir.substring(
      0,
      parseResult.data.rootDir.length - 1
    );
  }

  // Get user supplied settings
  return parseResult.data;
}
