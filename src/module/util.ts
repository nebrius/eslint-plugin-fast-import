import { readFileSync } from 'node:fs';

import { TSESTree } from '@typescript-eslint/typescript-estree';
import { parse, simpleTraverse } from '@typescript-eslint/typescript-estree';

import { InternalError } from '../util/error.js';

export type ImportDeclaration =
  | TSESTree.ImportDeclaration
  | TSESTree.ImportExpression;

// Note: technically speaking, ExportNamedDeclarationWithSource is a subtype of
// ExportDefaultDeclaration and according to TypeScript is represented by this
// type. In practice, it will never show up here though.
export type ExportDeclaration =
  | TSESTree.ExportDefaultDeclaration
  | TSESTree.ExportNamedDeclaration;

export type ReexportDeclaration =
  | TSESTree.ExportNamedDeclarationWithSource
  | TSESTree.ExportAllDeclaration;

/**
 * Reads in a file specified by `filePath` and returns the raw string contents
 * and the parsed AST.
 */
export function parseFile(filePath: string) {
  const fileContents = readFileSync(filePath, 'utf-8');
  const ast = parse(fileContents, {
    loc: true,
    range: true,
    tokens: true,

    // JSX is a proper superset of JavaScript, meaning JSX can appear in both .js and .jsx files. TSX is *not* a
    // proper superset of TypeScript, however, and so JSX can only appear in .tsx files, not .ts files
    jsx: !filePath.endsWith('.ts'),
  });
  return { filePath, fileContents, ast };
}

type WalkOptions = {
  filePath: string;
  fileContents: string;
  ast: TSESTree.Program;

  /**
   * A callback to be called for all of the various import statement nodes,
   * including dynamic import statements
   */
  importDeclaration: (node: ImportDeclaration, parent?: TSESTree.Node) => void;
  /**
   * A callback to be called for all of the various export statement nodes.
   *
   * Note: this does _not_ include reexport nodes, even though sometimes the
   * actual node is the same type as a reexport node.
   */
  exportDeclaration: (node: ExportDeclaration, parent?: TSESTree.Node) => void;
  /**
   * A callback to be called for all of the various reexport statement nodes
   */
  reexportDeclaration: (
    node: ReexportDeclaration,
    parent?: TSESTree.Node
  ) => void;
};

/**
 * This helper function makes traversing the AST of a file easier.
 */
export function traverse({
  ast,
  filePath,
  fileContents,
  importDeclaration,
  exportDeclaration,
  reexportDeclaration,
}: WalkOptions) {
  // For some reason, `simpleTraverse` only types `node` as `TSESTree.Node`, not
  // the type of node specified by the function name. This helper function
  // asserts the type and does a run-time check, just in case, to make
  // TypeScript happy.
  //
  // This type parameter is actually necessary, since it's used in the assert
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  function validateNodeType<NodeType extends TSESTree.Node>(
    node: TSESTree.Node,
    nodeType: TSESTree.AST_NODE_TYPES
  ): asserts node is NodeType {
    /* istanbul ignore if */
    if (node.type !== nodeType) {
      throw new InternalError(
        `simpleTraverse returned unexpected type ${node.type}`,
        { filePath, fileContents, node }
      );
    }
  }

  simpleTraverse(ast, {
    visitors: {
      ImportDeclaration(node, parent) {
        validateNodeType<TSESTree.ImportDeclaration>(
          node,
          TSESTree.AST_NODE_TYPES.ImportDeclaration
        );
        importDeclaration(node, parent);
      },
      ImportExpression(node, parent) {
        validateNodeType<TSESTree.ImportExpression>(
          node,
          TSESTree.AST_NODE_TYPES.ImportExpression
        );
        importDeclaration(node, parent);
      },
      ExportDefaultDeclaration(node, parent) {
        validateNodeType<TSESTree.ExportDefaultDeclaration>(
          node,
          TSESTree.AST_NODE_TYPES.ExportDefaultDeclaration
        );
        exportDeclaration(node, parent);
      },
      ExportAllDeclaration(node, parent) {
        validateNodeType<TSESTree.ExportAllDeclaration>(
          node,
          TSESTree.AST_NODE_TYPES.ExportAllDeclaration
        );
        reexportDeclaration(node, parent);
      },
      ExportNamedDeclaration(node, parent) {
        validateNodeType<TSESTree.ExportNamedDeclaration>(
          node,
          TSESTree.AST_NODE_TYPES.ExportNamedDeclaration
        );
        if (node.source) {
          reexportDeclaration(node, parent);
        } else {
          exportDeclaration(node, parent);
        }
      },
    },
  });
}
