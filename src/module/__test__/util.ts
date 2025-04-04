import type {
  BaseProjectInfo,
  BaseExport,
  BaseImport,
  BaseOtherFileDetails,
  BaseReexport,
} from '../../types/base';

type PartialBaseESMInfo = {
  files: Map<
    string,
    | {
        fileType: 'code';
        lastUpdatedAt?: number;
        imports: Partial<BaseImport>[];
        exports: Partial<BaseExport>[];
        reexports: Partial<BaseReexport>[];
      }
    | BaseOtherFileDetails
  >;
};

// ESM info includes the original AST node for use easy use correlating code
// together, but they're really difficult to represent in tests and unimportant.
// This utility strips them out for easier testing.
export function stripNodes(info: BaseProjectInfo) {
  const clonedInfo = { ...info } as PartialBaseESMInfo;
  for (const [, fileDetails] of clonedInfo.files) {
    if (fileDetails.fileType !== 'code') {
      continue;
    }
    delete fileDetails.lastUpdatedAt;
    for (const importDetails of fileDetails.imports) {
      delete importDetails.statementNode;
      delete importDetails.reportNode;
    }
    for (const reexportDetails of fileDetails.reexports) {
      delete reexportDetails.statementNode;
      delete reexportDetails.reportNode;
    }
    for (const exportDetails of fileDetails.exports) {
      delete exportDetails.statementNode;
      delete exportDetails.reportNode;
    }
  }
  return clonedInfo;
}
