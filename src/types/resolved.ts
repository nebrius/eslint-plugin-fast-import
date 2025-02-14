import type {
  BaseBarrelImport,
  BaseBarrelReexport,
  BaseCodeFileDetails,
  BaseDynamicImport,
  BaseExport,
  BaseOtherFileDetails,
  BaseSingleImport,
  BaseSingleReexport,
} from './base';

type Resolved =
  | {
      type: 'builtin';
    }
  | {
      type: 'thirdParty';
    }
  | {
      type: 'firstPartyCode';

      /**
       * The absolute path of the file that the import/reexport points to. For the statement in a file at
       * `/Users/bryan/myProject/src/foo.ts`:
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
      type: 'firstPartyOther';

      /**
       * The absolute path of the file that the import/reexport points to. For the statement in a file at
       * `/Users/bryan/myProject/src/foo.ts`:
       *
       * ```
       * import { bar } from './bar';
       * ```
       *
       * then `resolvedModulePath` is `/Users/bryan/myProject/src/bar/index.ts`
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

export type ResolvedCodeFileDetails = BaseCodeFileDetails & {
  imports: ResolvedImport[];
  exports: ResolvedExport[];
  reexports: ResolvedReexport[];
};

export type ResolvedFileDetails =
  | ResolvedOtherFileDetails
  | ResolvedCodeFileDetails;

export type ResolvedProjectInfo = {
  // Mapping of absolute filePath to file details
  files: Record<string, ResolvedFileDetails>;
};
