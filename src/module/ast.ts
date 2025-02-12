import { TSESTree } from '@typescript-eslint/typescript-estree';
import { parse, simpleTraverse } from '@typescript-eslint/typescript-estree';

export type ImportDeclaration =
  | TSESTree.ImportDeclaration
  | TSESTree.ImportExpression;

export type ExportDeclaration =
  | TSESTree.ExportDefaultDeclaration
  | TSESTree.ExportNamedDeclaration;

export type ReexportDeclaration =
  | TSESTree.ExportNamedDeclarationWithSource
  | TSESTree.ExportAllDeclaration;

type WalkOptions = {
  filePath: string;
  fileContents: string;

  // Not sure why ESLint is flagging these as errors
  /* eslint-disable no-unused-vars */
  importDeclaration?: (node: ImportDeclaration) => void;
  exportDeclaration?: (node: ExportDeclaration) => void;
  reexportDeclaration?: (node: ReexportDeclaration) => void;
  /* eslint-enable no-unused-vars */
};

export function traverse({
  filePath,
  fileContents,
  importDeclaration,
  exportDeclaration,
  reexportDeclaration,
}: WalkOptions) {
  const ast = parse(fileContents, {
    loc: true,
    range: true,

    // JSX is a proper superset of JavaScript, meaning JSX can appear in both .js and .jsx files. TSX is *not* a
    // proper superset of TypeScript, however, and so JSX can only appear in .tsx files, not .ts files
    jsx: !filePath.endsWith('.ts'),
  });

  simpleTraverse(ast, {
    visitors: {
      ImportDeclaration(node) {
        if (node.type !== TSESTree.AST_NODE_TYPES.ImportDeclaration) {
          throw new Error(
            `simpleTraverse returned unexpected type ${node.type}`
          );
        }
        importDeclaration?.(node);
      },
      ImportExpression(node) {
        if (node.type !== TSESTree.AST_NODE_TYPES.ImportExpression) {
          throw new Error(
            `simpleTraverse returned unexpected type ${node.type}`
          );
        }
        importDeclaration?.(node);
      },
      ExportDefaultDeclaration(node) {
        if (node.type !== TSESTree.AST_NODE_TYPES.ExportDefaultDeclaration) {
          throw new Error(
            `simpleTraverse returned unexpected type ${node.type}`
          );
        }
        exportDeclaration?.(node);
      },
      ExportAllDeclaration(node) {
        if (node.type !== TSESTree.AST_NODE_TYPES.ExportAllDeclaration) {
          throw new Error(
            `simpleTraverse returned unexpected type ${node.type}`
          );
        }
        reexportDeclaration?.(node);
      },
      ExportNamedDeclaration(node) {
        if (node.type !== TSESTree.AST_NODE_TYPES.ExportNamedDeclaration) {
          throw new Error(
            `simpleTraverse returned unexpected type ${node.type}`
          );
        }
        if (node.source) {
          reexportDeclaration?.(node);
        } else {
          exportDeclaration?.(node);
        }
      },
    },
  });
}
