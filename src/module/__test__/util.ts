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
    for (const importDetails of fileDetails.imports) {
      delete importDetails.statementNode;
      if ('specifierNode' in importDetails) {
        delete importDetails.specifierNode;
      }
    }
    for (const reexportDetails of fileDetails.reexports) {
      delete reexportDetails.statementNode;
      if ('specifierNode' in reexportDetails) {
        delete reexportDetails.specifierNode;
      }
    }
    for (const exportDetails of fileDetails.exports) {
      delete exportDetails.statementNode;
      delete exportDetails.specifierNode;
    }
  }
  return clonedInfo;
}
