import type {
  AnalyzedBarrelImport,
  AnalyzedBarrelReexport,
  AnalyzedCodeFileDetails,
  AnalyzedDynamicImport,
  AnalyzedExport,
  AnalyzedOtherFileDetails,
  AnalyzedProjectInfo,
  AnalyzedSingleImport,
  AnalyzedSingleReexport,
} from '../types/analyzed.js';
import type {
  BaseBarrelImport,
  BaseBarrelReexport,
  BaseCodeFileDetails,
  BaseDynamicImport,
  BaseExport,
  BaseOtherFileDetails,
  BaseProjectInfo,
  BaseSingleImport,
  BaseSingleReexport,
} from '../types/base.js';
import type {
  ResolvedBarrelImport,
  ResolvedBarrelReexport,
  ResolvedCodeFileDetails,
  ResolvedDynamicImport,
  ResolvedExport,
  ResolvedOtherFileDetails,
  ResolvedProjectInfo,
  ResolvedSingleImport,
  ResolvedSingleReexport,
} from '../types/resolved.js';

type StrippedFileDetails<
  OtherFileDetails extends BaseOtherFileDetails,
  CodeFileDetails extends BaseCodeFileDetails,
  SingleImport extends BaseSingleImport,
  BarrelImport extends BaseBarrelImport,
  DynamicImport extends BaseDynamicImport,
  Export extends BaseExport,
  SingleReexport extends BaseSingleReexport,
  BarrelReexport extends BaseBarrelReexport,
> =
  | OtherFileDetails
  | (Omit<
      CodeFileDetails,
      | 'singleImports'
      | 'barrelImports'
      | 'dynamicImports'
      | 'exports'
      | 'singleReexports'
      | 'barrelReexports'
      | 'lastUpdatedAt'
    > & {
      singleImports: Array<
        Omit<SingleImport, 'statementNodeRange' | 'reportNodeRange'>
      >;
      barrelImports: Array<
        Omit<BarrelImport, 'statementNodeRange' | 'reportNodeRange'>
      >;
      dynamicImports: Array<
        Omit<DynamicImport, 'statementNodeRange' | 'reportNodeRange'>
      >;
      exports: Array<Omit<Export, 'statementNodeRange' | 'reportNodeRange'>>;
      singleReexports: Array<
        Omit<SingleReexport, 'statementNodeRange' | 'reportNodeRange'>
      >;
      barrelReexports: Array<
        Omit<BarrelReexport, 'statementNodeRange' | 'reportNodeRange'>
      >;
    });

type StrippedBaseFileDetails = StrippedFileDetails<
  BaseOtherFileDetails,
  BaseCodeFileDetails,
  BaseSingleImport,
  BaseBarrelImport,
  BaseDynamicImport,
  BaseExport,
  BaseSingleReexport,
  BaseBarrelReexport
>;

type StrippedResolvedFileDetails = StrippedFileDetails<
  ResolvedOtherFileDetails,
  ResolvedCodeFileDetails,
  ResolvedSingleImport,
  ResolvedBarrelImport,
  ResolvedDynamicImport,
  ResolvedExport,
  ResolvedSingleReexport,
  ResolvedBarrelReexport
>;

type StrippedAnalyzedFileDetails = StrippedFileDetails<
  AnalyzedOtherFileDetails,
  AnalyzedCodeFileDetails,
  AnalyzedSingleImport,
  AnalyzedBarrelImport,
  AnalyzedDynamicImport,
  AnalyzedExport,
  AnalyzedSingleReexport,
  AnalyzedBarrelReexport
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
      singleImports: [],
      barrelImports: [],
      dynamicImports: [],
      exports: [],
      singleReexports: [],
      barrelReexports: [],
    };
    for (const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      statementNodeRange,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      reportNodeRange,
      ...strippedDetails
    } of fileDetails.singleImports) {
      newFileDetails.singleImports.push(strippedDetails);
    }

    for (const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      statementNodeRange,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      reportNodeRange,
      ...strippedDetails
    } of fileDetails.barrelImports) {
      newFileDetails.barrelImports.push(strippedDetails);
    }

    for (const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      statementNodeRange,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      reportNodeRange,
      ...strippedDetails
    } of fileDetails.dynamicImports) {
      newFileDetails.dynamicImports.push(strippedDetails);
    }

    for (const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      statementNodeRange,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      reportNodeRange,
      ...strippedDetails
    } of fileDetails.exports) {
      newFileDetails.exports.push(strippedDetails);
    }

    for (const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      statementNodeRange,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      reportNodeRange,
      ...strippedDetails
    } of fileDetails.singleReexports) {
      newFileDetails.singleReexports.push(strippedDetails);
    }

    for (const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      statementNodeRange,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      reportNodeRange,
      ...strippedDetails
    } of fileDetails.barrelReexports) {
      newFileDetails.barrelReexports.push(strippedDetails);
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
