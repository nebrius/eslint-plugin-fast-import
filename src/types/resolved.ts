import type {
  BaseBarrelImport,
  BaseBarrelReexport,
  BaseDynamicImport,
  BaseExport,
  BaseOtherFileDetails,
  BaseProjectInfo,
  BaseSingleImport,
  BaseSingleReexport,
} from './base.js';

export type Resolved =
  | {
      moduleType: 'builtin';
    }
  | {
      moduleType: 'thirdParty';
    }
  | {
      moduleType: 'firstPartyCode';

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
      moduleType: 'firstPartyOther';

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
export type ResolvedImport =
  | ResolvedSingleImport
  | ResolvedBarrelImport
  | ResolvedDynamicImport;

/* Exports */

export type ResolvedExport = BaseExport;

/* Reexports */

export type ResolvedSingleReexport = BaseSingleReexport & Resolved;
export type ResolvedBarrelReexport = BaseBarrelReexport & Resolved;
export type ResolvedReexport = ResolvedSingleReexport | ResolvedBarrelReexport;

/* File Details */

export type ResolvedOtherFileDetails = BaseOtherFileDetails;

export type ResolvedCodeFileDetails = {
  fileType: 'code';
  lastUpdatedAt: number;
  imports: ResolvedImport[];
  exports: ResolvedExport[];
  reexports: ResolvedReexport[];
};

type ResolvedFileDetails = ResolvedOtherFileDetails | ResolvedCodeFileDetails;

export type ResolvedProjectInfo = Omit<BaseProjectInfo, 'files'> & {
  /**
   * Mapping of _absolute_ file paths to file details
   */
  files: Map<string, ResolvedFileDetails>;
};
