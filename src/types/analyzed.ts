import type {
  ResolvedBarrelImport,
  ResolvedBarrelReexport,
  ResolvedDynamicImport,
  ResolvedExport,
  ResolvedOtherFileDetails,
  ResolvedProjectInfo,
  ResolvedSingleImport,
  ResolvedSingleReexport,
} from './resolved';

type AnalyzedImportBase =
  | {
      /**
       * A rootModuleType of `undefined` indicates we couldn't resolve the root export
       */
      rootModuleType: undefined;
    }
  | {
      rootModuleType: 'builtin';
    }
  | {
      rootModuleType: 'thirdParty';
    }
  | {
      rootModuleType: 'firstPartyOther';

      /**
       * The absolute path of the root file with the export that the import/reexport statement ultimately resolves to. In other
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
       * `/path/to/bar.ts`.
       *
       * Note: If the module cannot be resolved, this value is `undefined`.
       */
      rootModulePath: string | undefined;
    }
  | {
      rootModuleType: 'firstPartyCode';

      /**
       * The absolute path of the root file with the export that the import/reexport statement ultimately resolves to. In other
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
       * `/path/to/bar.ts`.
       *
       * Note: If the module cannot be resolved, this value is `undefined`.
       */
      rootModulePath: string | undefined;

      /**
       * The name of the original export
       *
       * Note: If the module cannot be resolved, this value is `undefined`.
       */
      rootName: string | undefined;
    };

type AnalyzedExportBase = {
  /**
   * A list of files that imports this export, including indirect imports that are funneled through reexport statements
   */
  importedByFiles: string[];

  /**
   * A list of files that reexport this export, including indirect reexports that themselves reexport a reexport
   */
  reexportedByFiles: string[];
};

type AnalyzedReexportBase = {
  /**
   * A list of files that imports this reexport, including indirect imports that are funneled through other reexport
   * statements
   */
  importedByFiles: string[];
};

/* Imports */

// Note: barrel and dynamic imports can't be resolved to a single file, since they bundle up multiple exports that could
// resolve to different files
export type AnalyzedSingleImport = ResolvedSingleImport & AnalyzedImportBase;
export type AnalyzedBarrelImport = ResolvedBarrelImport;
export type AnalyzedDynamicImport = ResolvedDynamicImport;
export type AnalyzedImport =
  | AnalyzedSingleImport
  | AnalyzedBarrelImport
  | AnalyzedDynamicImport;

/* Exports */

export type AnalyzedExport = ResolvedExport & AnalyzedExportBase;

/* Reexports */

export type AnalyzedSingleReexport = ResolvedSingleReexport &
  AnalyzedImportBase &
  AnalyzedReexportBase;
export type AnalyzedBarrelReexport = ResolvedBarrelReexport &
  AnalyzedReexportBase;
export type AnalyzedReexport = ResolvedSingleReexport | ResolvedBarrelReexport;

/* File Details */

export type AnalyzedOtherFileDetails = ResolvedOtherFileDetails;

export type AnalyzedCodeFileDetails = {
  fileType: 'code';
  imports: AnalyzedImport[];
  exports: AnalyzedExport[];
  reexports: AnalyzedReexport[];
};

export type AnalyzedFileDetails =
  | AnalyzedOtherFileDetails
  | AnalyzedCodeFileDetails;

export type AnalyzedProjectInfo = Omit<ResolvedProjectInfo, 'files'> & {
  /**
   * Mapping of _absolute_ file paths to file details
   */
  files: Record<string, AnalyzedFileDetails>;
};
