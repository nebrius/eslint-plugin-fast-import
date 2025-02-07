import type {
  ResolvedBarrelImport,
  ResolvedBarrelReexport,
  ResolvedCodeFileDetails,
  ResolvedExport,
  ResolvedOtherFileDetails,
  ResolvedSingleImport,
  ResolvedSingleReexport,
} from './resolved';

type AnalyzedImportBase = {
  rootFilepath: string | undefined;
  rootName: string;
};

type AnalyzedExportBase = {
  importedByFiles: string[];
  reexportedByFiles: string[];
};

/* Imports */

export type AnalyzedSingleImport = ResolvedSingleImport & AnalyzedImportBase;
export type AnalyzedBarrelImport = ResolvedBarrelImport & AnalyzedImportBase;
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

export type AnalyzedProject = {
  // Mapping of absolute filepath to file details
  files: Record<string, AnalyzedFileDetails>;
};
