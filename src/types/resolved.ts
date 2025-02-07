import type {
  BaseBarrelImport,
  BaseBarrelReexport,
  BaseCodeFileDetails,
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
      resolvedModulePath: string;
    }
  | {
      type: 'firstPartyOther';
      resolvedModulePath: string | undefined;
    };

/* Imports */

export type ResolvedSingleImport = BaseSingleImport & Resolved;
export type ResolvedBarrelImport = BaseBarrelImport & Resolved;
export type ResolvedImport = ResolvedSingleImport | ResolvedBarrelImport;

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

export type ResolvedESMInfo = {
  // Mapping of absolute filepath to file details
  files: Record<string, ResolvedFileDetails>;
};
