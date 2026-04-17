import type {
  AnalyzedBarrelImport,
  AnalyzedBarrelReexport,
  AnalyzedCodeFileDetails,
  AnalyzedDynamicImport,
  AnalyzedExport,
  AnalyzedOtherFileDetails,
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

export type StrippedBaseFileDetails = StrippedFileDetails<
  BaseOtherFileDetails,
  BaseCodeFileDetails,
  BaseSingleImport,
  BaseBarrelImport,
  BaseDynamicImport,
  BaseExport,
  BaseSingleReexport,
  BaseBarrelReexport
>;

export type StrippedResolvedFileDetails = StrippedFileDetails<
  ResolvedOtherFileDetails,
  ResolvedCodeFileDetails,
  ResolvedSingleImport,
  ResolvedBarrelImport,
  ResolvedDynamicImport,
  ResolvedExport,
  ResolvedSingleReexport,
  ResolvedBarrelReexport
>;

type StrippedAnalyzedSingleImport = Omit<
  AnalyzedSingleImport,
  'statementNodeRange' | 'reportNodeRange' | 'rootExportEntry'
>;
type StrippedAnalyzedBarrelImport = Omit<
  AnalyzedBarrelImport,
  'statementNodeRange' | 'reportNodeRange' | 'rootExportEntry'
>;
type StrippedAnalyzedSingleReexport = Omit<
  AnalyzedSingleReexport,
  'statementNodeRange' | 'reportNodeRange' | 'rootExportEntry'
>;

type StrippedAnalyzedExport = Omit<
  AnalyzedExport,
  | 'statementNodeRange'
  | 'reportNodeRange'
  | 'importedBy'
  | 'barrelImportedBy'
  | 'externallyImportedBy'
>;
type StrippedAnalyzedBarrelReexport = Omit<
  AnalyzedBarrelReexport,
  | 'statementNodeRange'
  | 'reportNodeRange'
  | 'importedBy'
  | 'barrelImportedBy'
  | 'externallyImportedBy'
>;

type StrippedExportImportedBy = Array<{
  filePath: string;
  importEntry: StrippedAnalyzedSingleImport;
}>;
type StrippedReexportImportedBy = Array<{
  filePath: string;
  importEntry: StrippedAnalyzedSingleImport | StrippedAnalyzedSingleReexport;
}>;
type StrippedBarrelImportedBy = Array<{
  filePath: string;
  importEntry: StrippedAnalyzedBarrelImport;
}>;
type StrippedExternallyImportedBy = Array<{
  filePath: string;
  importEntry: StrippedAnalyzedSingleImport;
}>;

export type StrippedAnalyzedFileDetails = StrippedFileDetails<
  AnalyzedOtherFileDetails,
  AnalyzedCodeFileDetails,
  Omit<AnalyzedSingleImport, 'rootExportEntry'> & {
    rootExportEntry?: StrippedAnalyzedExport | StrippedAnalyzedBarrelReexport;
  },
  AnalyzedBarrelImport,
  AnalyzedDynamicImport,
  Omit<
    AnalyzedExport,
    'importedBy' | 'barrelImportedBy' | 'externallyImportedBy'
  > & {
    importedBy?: StrippedExportImportedBy;
    barrelImportedBy?: StrippedBarrelImportedBy;
    externallyImportedBy?: StrippedExternallyImportedBy;
  },
  Omit<
    AnalyzedSingleReexport,
    | 'rootExportEntry'
    | 'importedBy'
    | 'barrelImportedBy'
    | 'externallyImportedBy'
  > & {
    importedBy?: StrippedReexportImportedBy;
    barrelImportedBy?: StrippedBarrelImportedBy;
    externallyImportedBy?: StrippedExternallyImportedBy;
    rootExportEntry?: StrippedAnalyzedExport | StrippedAnalyzedBarrelReexport;
  },
  Omit<
    AnalyzedBarrelReexport,
    | 'rootExportEntry'
    | 'importedBy'
    | 'barrelImportedBy'
    | 'externallyImportedBy'
  > & {
    rootExportEntry?: StrippedAnalyzedExport | StrippedAnalyzedBarrelReexport;
    importedBy?: StrippedExportImportedBy;
    barrelImportedBy?: StrippedBarrelImportedBy;
    externallyImportedBy?: StrippedExternallyImportedBy;
  }
>;
