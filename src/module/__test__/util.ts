import type {
  BaseESMInfo,
  BaseExport,
  BaseImport,
  BaseOtherFileDetails,
  BaseReexport,
} from '../../types/base';

type PartialBaseESMInfo = {
  files: Record<
    string,
    | {
        type: 'esm';
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
export function stripNodes(info: BaseESMInfo) {
  const clonedInfo = { ...info } as PartialBaseESMInfo;
  for (const fileDetails of Object.values(clonedInfo.files)) {
    if (fileDetails.type !== 'esm') {
      continue;
    }
    for (const importDetails of fileDetails.imports) {
      delete importDetails.statementNode;
      if ('specifierNode' in importDetails) {
        delete importDetails.specifierNode;
      }
    }
  }
  return clonedInfo;
}
