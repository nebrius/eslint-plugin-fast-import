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

export type StrippedAnalyzedFileDetails = StrippedFileDetails<
  AnalyzedOtherFileDetails,
  AnalyzedCodeFileDetails,
  Omit<AnalyzedSingleImport, 'rootExportEntry'> & {
    rootExportEntry?:
      | Omit<
          AnalyzedExport,
          | 'statementNodeRange'
          | 'reportNodeRange'
          | 'importedBy'
          | 'barrelImportedBy'
        >
      | Omit<
          AnalyzedBarrelReexport,
          | 'statementNodeRange'
          | 'reportNodeRange'
          | 'importedBy'
          | 'barrelImportedBy'
        >;
  },
  AnalyzedBarrelImport,
  AnalyzedDynamicImport,
  Omit<AnalyzedExport, 'importedBy' | 'barrelImportedBy'> & {
    importedBy?: Array<{
      filePath: string;
      importEntry: Omit<
        AnalyzedSingleImport,
        'statementNodeRange' | 'reportNodeRange' | 'rootExportEntry'
      >;
    }>;
    barrelImportedBy?: Array<{
      filePath: string;
      importEntry: Omit<
        AnalyzedBarrelImport,
        'statementNodeRange' | 'reportNodeRange' | 'rootExportEntry'
      >;
    }>;
  },
  Omit<AnalyzedSingleReexport, 'rootExportEntry'> & {
    rootExportEntry?:
      | Omit<
          AnalyzedExport,
          | 'statementNodeRange'
          | 'reportNodeRange'
          | 'importedBy'
          | 'barrelImportedBy'
        >
      | Omit<
          AnalyzedBarrelReexport,
          | 'statementNodeRange'
          | 'reportNodeRange'
          | 'importedBy'
          | 'barrelImportedBy'
        >;
  },
  Omit<
    AnalyzedBarrelReexport,
    'rootExportEntry' | 'importedBy' | 'barrelImportedBy'
  > & {
    rootExportEntry?:
      | Omit<
          AnalyzedExport,
          | 'statementNodeRange'
          | 'reportNodeRange'
          | 'importedBy'
          | 'barrelImportedBy'
        >
      | Omit<
          AnalyzedBarrelReexport,
          | 'statementNodeRange'
          | 'reportNodeRange'
          | 'importedBy'
          | 'barrelImportedBy'
        >;
    importedBy?: Array<{
      filePath: string;
      importEntry: Omit<
        AnalyzedSingleImport,
        'statementNodeRange' | 'reportNodeRange' | 'rootExportEntry'
      >;
    }>;
    barrelImportedBy?: Array<{
      filePath: string;
      importEntry: Omit<
        AnalyzedBarrelImport,
        'statementNodeRange' | 'reportNodeRange' | 'rootExportEntry'
      >;
    }>;
  }
>;
