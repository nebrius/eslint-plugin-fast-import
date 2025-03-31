import { ESLintUtils } from '@typescript-eslint/utils';
import type { GenericContext } from '../types/context';
import {
  getProjectInfo,
  initializeProject,
  updateCacheForFile,
} from '../module';
import { getSettings } from '../settings/settings';

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/nebrius/esm-utils/tree/main/src/rules/${name}/README.md`
);

export function getESMInfo(context: GenericContext) {
  const settings = getSettings(context);
  initializeProject(settings);

  // TODO: don't run this in single shot mode
  updateCacheForFile(
    context.filename,
    context.sourceCode.getText(),
    context.sourceCode.ast,
    settings
  );

  const projectInfo = getProjectInfo();

  // Format and return the ESM info
  const fileInfo = projectInfo.files.get(context.filename);
  if (!fileInfo) {
    return;
  }
  return {
    fileInfo,
    projectInfo,
  };
}
