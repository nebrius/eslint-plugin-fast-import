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
} from './base.js';

export type Resolved =
  | {
      resolvedModuleType: 'builtin';

      // For some reason, passing `Resolved` when intersected with Base through
      // an Omit (aka what we do in tests) causes `resolvedModulePath` to never
      // be an allowed property. So we set this as optional+undefined to help.
      resolvedModulePath?: undefined;
    }
  | {
      resolvedModuleType: 'thirdParty';

      // For some reason, passing `Resolved` when intersected with Base through
      // an Omit (aka what we do in tests) causes `resolvedModulePath` to never
      // be an allowed property. So we set this as optional+undefined to help.
      resolvedModulePath?: undefined;
    }
  | {
      resolvedModuleType: 'firstPartyCode';

      /**
       * The absolute path of the file that the import/reexport points to. For
       * the statement in a file at `/Users/bryan/myProject/src/foo.ts`:
       *
       * ```
       * import { bar } from './bar';
       * ```
       *
       * then `resolvedModulePath` is `/Users/bryan/myProject/src/bar/index.ts`
       */
      resolvedModulePath: string;
    }
  | {
      resolvedModuleType: 'firstPartyOther';

      /**
       * The absolute path of the file that the import/reexport points to. For
       * the statement in a file at `/Users/bryan/myProject/src/foo.ts`:
       *
       * ```
       * import { bar } from './bar';
       * ```
       *
       * then `resolvedModulePath` is `/Users/bryan/myProject/src/bar/index.ts`
       *
       * Note: value is `undefined` if the import can't be resolved, aka the
       * module specifier isn't valid. While the developer's intentions might
       * have been to import a code file, we can't don't know for sure.
       * Pretending it's always a non-code file is safer
       */
      resolvedModulePath: string | undefined;
    };

/* Imports */

export type ResolvedSingleImport = BaseSingleImport & Resolved;
export type ResolvedBarrelImport = BaseBarrelImport & Resolved;
export type ResolvedDynamicImport = BaseDynamicImport & Resolved;

/* Exports */

export type ResolvedExport = BaseExport;

/* Reexports */

export type ResolvedSingleReexport = BaseSingleReexport & Resolved;
export type ResolvedBarrelReexport = BaseBarrelReexport & Resolved;

/* File Details */

export type ResolvedOtherFileDetails = BaseOtherFileDetails;

export type ResolvedCodeFileDetails = Omit<
  BaseCodeFileDetails,
  | 'exports'
  | 'singleImports'
  | 'barrelImports'
  | 'dynamicImports'
  | 'singleReexports'
  | 'barrelReexports'
> & {
  exports: ResolvedExport[];
  singleImports: ResolvedSingleImport[];
  barrelImports: ResolvedBarrelImport[];
  dynamicImports: ResolvedDynamicImport[];
  singleReexports: ResolvedSingleReexport[];
  barrelReexports: ResolvedBarrelReexport[];
};

type ResolvedFileDetails = ResolvedOtherFileDetails | ResolvedCodeFileDetails;

export type ResolvedProjectInfo = Omit<BaseProjectInfo, 'files'> & {
  /**
   * Mapping of _absolute_ file paths to file details
   */
  files: Map<string, ResolvedFileDetails>;
};
