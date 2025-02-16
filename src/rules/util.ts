import type { AnalyzedFileDetails } from '@/types/analyzed';
import { ESLintUtils } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/nebrius/esm-utils/tree/main/src/rules/${name}/README.md`
);

export function getESMInfo(filePath: string): AnalyzedFileDetails {
  return { fileType: 'other' };
}
