import type { TSESTree } from '@typescript-eslint/utils';

type Base = {
  filepath: string;
  range: TSESTree.Node['range'];
};

/* Imports */

export type BaseSingleImport = Base & {
  type: 'singleImport';
  moduleSpecifier: string;
  importName: string;
  importAlias: string;
  isTypeImport: boolean;
};

export type BaseBarrelImport = Base & {
  type: 'barrelImport';
};

export type BaseImport = BaseSingleImport | BaseBarrelImport;

/* Exports */

export type BaseExport = Base & {
  type: 'export';
  name: string; // Default exports are represented by the string "default"
  isTypeExport: boolean;
};

/* Reexports */

export type BaseSingleReexport = Base & {
  type: 'singleReexport';
  moduleSpecifier: string;
  exportName: string;
  importName: string;
  isTypeExport: boolean;
};

export type BaseBarrelReexport = Base & {
  type: 'barrelReexport';
  moduleSpecifier: string;
  exportName?: string;
  isTypeExport: boolean;
};

export type BaseReexport = BaseSingleReexport | BaseBarrelReexport;

/* File Details */

export type BaseOtherFileDetails = {
  type: 'other';
};

export type BaseCodeFileDetails = {
  type: 'esm';
  imports: BaseImport[];
  exports: BaseExport[];
  reexports: BaseReexport[];
};

export type BaseFileDetails = BaseOtherFileDetails | BaseCodeFileDetails;

export type BaseESMInfo = {
  // Mapping of absolute filepath to file details
  files: Record<string, BaseFileDetails>;
};
