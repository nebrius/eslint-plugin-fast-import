import type { TSESTree } from '@typescript-eslint/utils';

type Base = {
  /**
   * The absolute path to the file that this ESM statement is in
   */
  filePath: string;

  /**
   * The original AST node in ESTree format for this ESM statement
   */
  statementNode: TSESTree.Node;
};

/* Imports */

export type BaseSingleImport = Base & {
  type: 'singleImport';

  /**
   * Where we're importing from, e.g. `'./bar'` in `import { foo } from './bar'`
   */
  moduleSpecifier: string;

  /**
   * What we're importing, e.g. `foo` in `import { foo } from './bar'`
   */
  importName: string;

  /**
   * What we're calling the import locally. This is usually the same as
   * `importName`, but can sometimes be different. If we do:
   *
   * `import { foo as alias } from './bar'`
   *
   * then `importName` equals `foo` and `importAlias` equals `alias`
   */
  importAlias: string;

  /**
   * If true, then this is a TypeScript type import, e.g. `import type { Foo } from './bar'`
   */
  isTypeImport: boolean;

  /**
   * The original AST node in ESTree format for the specifier in the statement,
   * e.g. the AST node for `foo as bar` in `import { foo as bar } from './bar`
   */
  specifierNode: TSESTree.Node;
};

export type BaseBarrelImport = Base & {
  type: 'barrelImport';

  /**
   * Where we're importing from, e.g. `'./bar'` in `import * as foo from './bar'`
   */
  moduleSpecifier: string;
};

export type BaseDynamicImport = Base & {
  type: 'dynamicImport';

  /**
   * Where we're importing from, e.g. `'./bar'` in `import('./bar')`
   *
   * Note: if the value is not a string literal, then this value is `undefined`
   */
  moduleSpecifier: string | undefined;
};

export type BaseImport =
  | BaseSingleImport
  | BaseBarrelImport
  | BaseDynamicImport;

/* Exports */

export type BaseExport = Base & {
  type: 'export';
  name: string; // Default exports are represented by the string "default"
  isTypeExport: boolean;
};

/* Reexports */

export type BaseSingleReexport = Base & {
  type: 'singleReexport';

  /**
   * Where we're reexporting from, e.g. `'./bar'` in `export { foo } from './bar'`
   */
  moduleSpecifier: string;

  /**
   * What we're reexporting, e.g. `foo` in `export { foo } from './bar'`
   */
  importName: string;

  /**
   * What we're naming the reexport. This is usually the same as
   * `importName`, but can sometimes be different. If we do:
   *
   * `export { foo as alias } from './bar'`
   *
   * then `importName` equals `foo` and `exportName` equals `alias`
   */
  exportName: string;

  /**
   * If true, then this is a TypeScript type reexport, e.g. `export type { Foo } from './bar'`
   */
  isTypeReexport: boolean;

  /**
   * The original AST node in ESTree format for the specifier in the statement,
   * e.g. the AST node for `foo as bar` in `import { foo as bar } from './bar`
   */
  specifierNode: TSESTree.Node;
};

export type BaseBarrelReexport = Base & {
  type: 'barrelReexport';

  /**
   * Where we're reexporting from, e.g. `'./bar'` in `export * from './bar'`
   */
  moduleSpecifier: string;

  /**
   * The name of the rollup object, if specified, e.g. `foo` in `export * as foo from './bar'`
   */
  exportName: string | undefined;

  /**
   * If true, then this is a TypeScript type reexport, e.g. `export type * from './bar'`
   */
  isTypeReexport: boolean;
};

export type BaseReexport = BaseSingleReexport | BaseBarrelReexport;

/* File Details */

/**
 * This represents a file that is imported in ESM code, but is not an ESM file.
 * Examples include importing CSS or JSON files. These files get an entry for
 * bookeeping reasons, but otherwise are not parsed or anlayzed
 */
export type BaseOtherFileDetails = {
  type: 'other';
};

/**
 * Represents an ESM file and its imports, exports, and reexports.
 */
export type BaseCodeFileDetails = {
  type: 'esm';
  imports: BaseImport[];
  exports: BaseExport[];
  reexports: BaseReexport[];
};

export type BaseFileDetails = BaseOtherFileDetails | BaseCodeFileDetails;

export type BaseESMInfo = {
  /**
   * Mapping of _absolute_ file paths to file details
   */
  files: Record<string, BaseFileDetails>;
};
