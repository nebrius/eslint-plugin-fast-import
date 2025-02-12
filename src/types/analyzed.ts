import type {
  ResolvedBarrelImport,
  ResolvedBarrelReexport,
  ResolvedCodeFileDetails,
  ResolvedDynamicImport,
  ResolvedExport,
  ResolvedOtherFileDetails,
  ResolvedSingleImport,
  ResolvedSingleReexport,
} from './resolved';

type AnalyzedImportBase = {
  rootFilePath: string | undefined;
  rootName: string;
};

type AnalyzedExportBase = {
  importedByFiles: string[];
  reexportedByFiles: string[];
};

/* Imports */

// Note: barrel and dynamic imports can't be resolved to a single file, since
// they bundle up multiple exports that could resolve to different files
export type AnalyzedSingleImport = ResolvedSingleImport & AnalyzedImportBase;
export type AnalyzedBarrelImport = ResolvedBarrelImport;
export type AnalyzedDynamicImport = ResolvedDynamicImport;
export type AnalyzedImport = AnalyzedSingleImport | AnalyzedBarrelImport;

/* Exports */

export type AnalyzedExport = ResolvedExport & AnalyzedExportBase;

/* Reexports */

export type AnalyzedSingleReexport = ResolvedSingleReexport &
  AnalyzedImportBase &
  AnalyzedExportBase;
export type AnalyzedBarrelReexport = ResolvedBarrelReexport &
  AnalyzedImportBase &
  AnalyzedExportBase;
export type AnalyzedReexport = ResolvedSingleReexport | ResolvedBarrelReexport;

/* File Details */

export type AnalyzedOtherFileDetails = ResolvedOtherFileDetails;

export type AnalyzedCodeFileDetails = ResolvedCodeFileDetails & {
  imports: AnalyzedImport[];
  exports: AnalyzedExport[];
  reexports: AnalyzedReexport[];
};

export type AnalyzedFileDetails =
  | AnalyzedOtherFileDetails
  | AnalyzedCodeFileDetails;

export type AnalyzedESMInfo = {
  // Mapping of absolute filePath to file details
  files: Record<string, AnalyzedFileDetails>;
};
