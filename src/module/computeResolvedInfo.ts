import type { BaseProjectInfo } from '@/types/base';
import type { ResolvedProjectInfo } from '@/types/resolved';

export function computeResolvedInfo(
  baseInfo: BaseProjectInfo
): ResolvedProjectInfo {
  const resolvedInfo: ResolvedProjectInfo = {
    files: {},
  };
  for (const [filePath, fileDetails] of Object.entries(baseInfo.files)) {
    if (fileDetails.type !== 'esm') {
      continue;
    }
    for (const importDetails of fileDetails.imports) {
      //
    }
    for (const reexportDetails of fileDetails.reexports) {
      //
    }
  }
  return resolvedInfo;
}
