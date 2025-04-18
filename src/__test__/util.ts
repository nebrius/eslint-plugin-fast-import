import type {
  AnalyzedCodeFileDetails,
  AnalyzedExport,
  AnalyzedImport,
  AnalyzedOtherFileDetails,
  AnalyzedProjectInfo,
  AnalyzedReexport,
} from '../types/analyzed.js';
import type {
  BaseCodeFileDetails,
  BaseExport,
  BaseImport,
  BaseOtherFileDetails,
  BaseProjectInfo,
  BaseReexport,
} from '../types/base.js';
import type {
  ResolvedCodeFileDetails,
  ResolvedExport,
  ResolvedImport,
  ResolvedOtherFileDetails,
  ResolvedProjectInfo,
  ResolvedReexport,
} from '../types/resolved.js';

type StrippedFileDetails<
  OtherFileDetails extends BaseOtherFileDetails,
  CodeFileDetails extends BaseCodeFileDetails,
  Import extends BaseImport,
  Export extends BaseExport,
  Reexport extends BaseReexport,
> =
  | OtherFileDetails
  | (Omit<
      CodeFileDetails,
      'imports' | 'exports' | 'reexports' | 'lastUpdatedAt'
    > & {
      imports: Array<Omit<Import, 'statementNodeRange' | 'reportNodeRange'>>;
      exports: Array<Omit<Export, 'statementNodeRange' | 'reportNodeRange'>>;
      reexports: Array<
        Omit<Reexport, 'statementNodeRange' | 'reportNodeRange'>
      >;
    });

type StrippedBaseFileDetails = StrippedFileDetails<
  BaseOtherFileDetails,
  BaseCodeFileDetails,
  BaseImport,
  BaseExport,
  BaseReexport
>;

type StrippedResolvedFileDetails = StrippedFileDetails<
  ResolvedOtherFileDetails,
  ResolvedCodeFileDetails,
  ResolvedImport,
  ResolvedExport,
  ResolvedReexport
>;

type StrippedAnalyzedFileDetails = StrippedFileDetails<
  AnalyzedOtherFileDetails,
  AnalyzedCodeFileDetails,
  AnalyzedImport,
  AnalyzedExport,
  AnalyzedReexport
>;

export type StrippedBaseProjectInfo = Omit<BaseProjectInfo, 'files'> & {
  files: Map<string, StrippedBaseFileDetails>;
};

export type StrippedResolvedProjectInfo = Omit<ResolvedProjectInfo, 'files'> & {
  files: Map<string, StrippedResolvedFileDetails>;
};

export type StrippedAnalyzedProjectInfo = Omit<AnalyzedProjectInfo, 'files'> & {
  files: Map<string, StrippedAnalyzedFileDetails>;
};

// Strip info from
export function stripNodesFromBaseInfo(info: BaseProjectInfo) {
  const clonedInfo: StrippedBaseProjectInfo = {
    rootDir: info.rootDir,
    wildcardAliases: info.wildcardAliases,
    fixedAliases: info.fixedAliases,
    files: new Map(),
    availableThirdPartyDependencies: new Map(),
  };
  for (const [filePath, fileDetails] of info.files) {
    if (fileDetails.fileType !== 'code') {
      clonedInfo.files.set(filePath, fileDetails);
      continue;
    }
    const newFileDetails: StrippedBaseFileDetails = {
      fileType: fileDetails.fileType,
      imports: [],
      exports: [],
      reexports: [],
    };
    for (const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      statementNodeRange: statementNode,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      reportNodeRange: reportNode,
      ...strippedDetails
    } of fileDetails.imports) {
      newFileDetails.imports.push(strippedDetails);
    }
    for (const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      statementNodeRange: statementNode,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      reportNodeRange: reportNode,
      ...strippedDetails
    } of fileDetails.reexports) {
      newFileDetails.reexports.push(strippedDetails);
    }
    for (const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      statementNodeRange: statementNode,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      reportNodeRange: reportNode,
      ...strippedDetails
    } of fileDetails.exports) {
      newFileDetails.exports.push(strippedDetails);
    }
    clonedInfo.files.set(filePath, newFileDetails);
  }
  return clonedInfo;
}

export function stripNodesFromResolvedInfo(info: ResolvedProjectInfo) {
  return stripNodesFromBaseInfo(info) as StrippedResolvedProjectInfo;
}

export function stripNodesFromAnalyzedInfo(info: AnalyzedProjectInfo) {
  return stripNodesFromBaseInfo(info) as StrippedAnalyzedProjectInfo;
}

export function sortMap<T>(map: Map<string, T>): Map<string, T> {
  return new Map(Array.from(map.entries()).sort());
}
