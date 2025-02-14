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
} from './resolved';

type AnalyzedImportBase = {
  /**
   * The absolute path of the file with the export that the import/reexport statement ultimately resolves to. In other
   * words, if we have:
   *
   * ```
   * // foo.ts
   * import { baz } from './bar'
   *
   * // bar.ts
   * export { baz } from './baz'
   *
   * // baz.ts
   * export const baz = 10;
   * ```
   *
   * then `rootModulePath` in `foo.ts` is `/path/to/baz.ts`. Contrast this with `resolvedModulePath` which equals
   * `/path/to/bar.ts`
   */
  rootModulePath: string | undefined;

  /**
   * The name of the original export
   */
  rootName: string;
};

type AnalyzedExportBase = {
  /**
   * A list of files that imports this export, including indirect imports that are funneled through reexport statements
   */
  importedByFiles: string[];

  /**
   * A list of files that reexport this import, including indirect reexports that themselves reexport a reexport
   */
  reexportedByFiles: string[];
};

/* Imports */

// Note: barrel and dynamic imports can't be resolved to a single file, since they bundle up multiple exports that could
// resolve to different files
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

export type AnalyzedProjectInfo = ResolvedProjectInfo & {
  /**
   * Mapping of _absolute_ file paths to file details
   */
  files: Record<string, AnalyzedFileDetails>;
};
