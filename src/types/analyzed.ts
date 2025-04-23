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
} from './resolved.js';

type AnalyzedImportBase =
  | {
      /**
       * A rootModuleType of `undefined` indicates that either:
       * 1. The statement is a reexport statement that is not an entry point,
       * 2. The root export could not be resolved
       */
      rootModuleType: undefined;

      // Similar to the resolved equivalent, we have to add this to narrow down
      // types properly in test code
      rootModulePath?: undefined;
      rootExportEntry?: undefined;
    }
  | {
      rootModuleType: 'builtin';

      // Similar to the resolved equivalent, we have to add this to narrow down
      // types properly in test code
      rootModulePath?: undefined;
      rootExportEntry?: undefined;
    }
  | {
      rootModuleType: 'thirdParty';

      // Similar to the resolved equivalent, we have to add this to narrow down
      // types properly in test code
      rootModulePath?: undefined;
      rootExportEntry?: undefined;
    }
  | {
      rootModuleType: 'firstPartyOther';

      /**
       * The absolute path of the root file with the export that the
       * import/reexport statement ultimately resolves to. In other words, if we
       * have:
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
       * then `rootModulePath` in `foo.ts` is `/path/to/baz.ts`. Contrast this
       * with `resolvedModulePath` which equals `/path/to/bar.ts`.
       */
      rootModulePath: string;

      // Similar to the resolved equivalent, we have to add this to narrow down
      // types properly in test code
      rootExportEntry?: undefined;
    }
  | {
      rootModuleType: 'firstPartyCode';

      /**
       * The absolute path of the root file with the export that the
       * import/reexport statement ultimately resolves to. In other words, if we
       * have:
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
       * then `rootModulePath` in `foo.ts` is `/path/to/baz.ts`. Contrast this
       * with `resolvedModulePath` which equals `/path/to/bar.ts`.
       */
      rootModulePath: string;

      /**
       * The root export entry that this import/reexport statement ultimately
       * resolves to.
       *
       * Most of the time this is an export statement, but on occasion it can
       * be a named barrel reexportin the middle of the reexport chain.
       *
       * Consider this code:
       *
       * ```
       * // foo.ts
       * import { baz } from './bar'
       *
       * // bar.ts
       * export * as baz from './baz'
       * ```
       *
       * In this case, there is a named export we found, but we can't go any
       * further because there is nothing named, or singular, past this point
       */
      rootExportEntry: AnalyzedExport | AnalyzedBarrelReexport;
    };

type AnalyzedExportBase = {
  /**
   * A list of files and import entries that imports this export, including
   * indirect imports that are funneled through reexport statements.
   *
   * This also includes reexports that are entry points, since they are acting
   * like an import for the purposes of this plugin
   */
  importedBy: Array<{
    filePath: string;
    importEntry: AnalyzedSingleImport | AnalyzedSingleReexport;
  }>;

  /**
   * A list of files that barrel imports this export, including indirect imports
   * that are funneled through reexport statements.
   *
   * This also includes reexports that are entry points, since they are acting
   * like an import for the purposes of this plugin
   *
   * Note: unlike `importedBy`, entries here do not actually guarantee this
   * import is actually used
   */
  barrelImportedBy: Array<{
    filePath: string;
    importEntry:
      | AnalyzedBarrelReexport
      | AnalyzedSingleImport
      | AnalyzedSingleReexport
      | ResolvedBarrelImport
      | ResolvedDynamicImport;
  }>;
};

/* Imports */

// Note: barrel and dynamic imports can't be resolved to a single file, since
// they bundle up multiple exports that could resolve to different files
export type AnalyzedSingleImport = ResolvedSingleImport & AnalyzedImportBase;
export type AnalyzedBarrelImport = ResolvedBarrelImport;
export type AnalyzedDynamicImport = ResolvedDynamicImport;

/* Exports */

export type AnalyzedExport = ResolvedExport & AnalyzedExportBase;

/* Reexports */

export type AnalyzedSingleReexport = ResolvedSingleReexport &
  AnalyzedImportBase &
  AnalyzedExportBase;
export type AnalyzedBarrelReexport = ResolvedBarrelReexport &
  AnalyzedExportBase;

/* File Details */

export type AnalyzedOtherFileDetails = ResolvedOtherFileDetails;

export type AnalyzedCodeFileDetails = Omit<
  ResolvedCodeFileDetails,
  | 'exports'
  | 'singleImports'
  | 'barrelImports'
  | 'dynamicImports'
  | 'singleReexports'
  | 'barrelReexports'
> & {
  exports: AnalyzedExport[];
  singleImports: AnalyzedSingleImport[];
  barrelImports: AnalyzedBarrelImport[];
  dynamicImports: AnalyzedDynamicImport[];
  singleReexports: AnalyzedSingleReexport[];
  barrelReexports: AnalyzedBarrelReexport[];
};

type AnalyzedFileDetails = AnalyzedOtherFileDetails | AnalyzedCodeFileDetails;

export type AnalyzedProjectInfo = Omit<ResolvedProjectInfo, 'files'> & {
  /**
   * Mapping of _absolute_ file paths to file details
   */
  files: Map<string, AnalyzedFileDetails>;
};
