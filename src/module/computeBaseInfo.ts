import type { BaseCodeFileDetails, BaseESMInfo } from '../types/base';
import { readdirSync } from 'fs';
import { extname, join } from 'path';
import type { ExportDeclaration } from './ast';
import { parseFile, traverse } from './ast';
import { TSESTree } from '@typescript-eslint/utils';
import { AssertNeverError, InternalError } from '../util/error';

const VALID_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

/**
 * Computes base ESM info for all source files recursively found in basePath
 */
export function computeBaseInfo(basePath: string): BaseESMInfo {
  const info: BaseESMInfo = {
    files: {},
  };

  const potentialFiles = readdirSync(basePath, {
    recursive: true,
    encoding: 'utf-8',
  });

  for (const potentialFilePath of potentialFiles) {
    if (VALID_EXTENSIONS.includes(extname(potentialFilePath))) {
      const filePath = join(basePath, potentialFilePath);
      info.files[filePath] = computeFileDetails(parseFile(filePath));
    }
  }

  return info;
}

class UnknownNodeTypeError extends AssertNeverError {
  constructor(filePath: string, fileContents: string, node: never) {
    super(
      node,
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      `unknown AST node type ${(node as any).type}`,
      {
        filePath,
        fileContents,
        node,
      }
    );
  }
}

function walkExportDestructure(
  filePath: string,
  fileContents: string,
  fileDetails: BaseCodeFileDetails,
  statementNode: ExportDeclaration,
  node: TSESTree.ArrayPattern | TSESTree.ObjectPattern
) {
  // Check if this is an array destructure
  if (node.type === TSESTree.AST_NODE_TYPES.ArrayPattern) {
    for (const elementNode of node.elements) {
      // First, check if this is an array hole, e.g. the second
      // element in `[a, , b]`, and if so skip
      if (!elementNode) {
        continue;
      }

      // First check if we need to keep walking the destructure tree
      if (
        elementNode.type === TSESTree.AST_NODE_TYPES.ArrayPattern ||
        elementNode.type === TSESTree.AST_NODE_TYPES.ObjectPattern
      ) {
        walkExportDestructure(
          filePath,
          fileContents,
          fileDetails,
          statementNode,
          elementNode
        );
        continue;
      }

      // Otherwise we can get the name directly
      switch (elementNode.type) {
        // export const [ foo = 10 ] = [ 10 ]
        case TSESTree.AST_NODE_TYPES.AssignmentPattern: {
          throw new Error('Unimplemented');
        }

        // export const [ foo ] = [ 10 ]
        case TSESTree.AST_NODE_TYPES.Identifier: {
          fileDetails.exports.push({
            type: 'export',
            filePath,
            statementNode,
            specifierNode: elementNode,
            exportName: elementNode.name,
          });
          break;
        }

        // AFAICT this isn't actually valid, since it would imply
        // export const [ foo.bar ], but I'm not 100% certain. See:
        // https://github.com/estree/estree/issues/162
        case TSESTree.AST_NODE_TYPES.MemberExpression: {
          throw new InternalError(
            `unexpected member expression in array destructure`,
            { filePath, fileContents, node: elementNode }
          );
        }

        // export const [ ...foo ] = [ 10 ]
        case TSESTree.AST_NODE_TYPES.RestElement: {
          // Fun fact, did you know that `const [ ...[ foo, bar ] ]`
          // and friends are actually valid?
          throw new Error('Unimplemented');
        }

        default: {
          throw new UnknownNodeTypeError(filePath, fileContents, elementNode);
        }
      }
    }
  }
  // Otherwise it's an object destructure
  else {
    throw new Error('Unimplemented');
  }
}

// Exports are almost always identifiers, but on rare occasions they
// can actually be strings, such as in:
//
// const x = 10;
// export { x as 'some string' };
//
// We actually don't care if the name is an identifier or string
// though, so this function normalizes the value
function getIdentifierOrStringValue(
  node: TSESTree.Identifier | TSESTree.StringLiteral
) {
  return node.type === TSESTree.AST_NODE_TYPES.Identifier
    ? node.name
    : node.value;
}

function computeFileDetails({
  filePath,
  fileContents,
  ast,
}: {
  filePath: string;
  fileContents: string;
  ast: TSESTree.Program;
}): BaseCodeFileDetails {
  const fileDetails: BaseCodeFileDetails = {
    type: 'esm',
    imports: [],
    exports: [],
    reexports: [],
  };

  traverse({
    filePath,
    fileContents,
    ast,
    importDeclaration(statementNode) {
      // First, get the module specifier, if present. It might be missing in the
      // case of a dynamic import where the sourcefile value is computed, e.g.
      // `await import('foo' + 'bar' + computeThing())`.
      const moduleSpecifier =
        statementNode.source.type === TSESTree.AST_NODE_TYPES.Literal
          ? (statementNode.source.value ?? undefined)
          : undefined;
      if (
        typeof moduleSpecifier !== 'string' &&
        typeof moduleSpecifier !== 'undefined'
      ) {
        throw new InternalError(
          `Import source ${String(moduleSpecifier)} is not a string or undefined`,
          {
            filePath,
            fileContents,
            node: statementNode.source,
          }
        );
      }

      // We check if this is a dynamic import first, since it's the only type of
      // import that may not have a string module specifier.
      if (statementNode.type === TSESTree.AST_NODE_TYPES.ImportExpression) {
        fileDetails.imports.push({
          type: 'dynamicImport',
          filePath,
          statementNode,
          moduleSpecifier,
        });
        return;
      }

      // Now that we know this isn't a dynamic import, we can enforce that the
      // module specifier is a string. In practice this should always be a
      // string at this point, but we check to make TypeScript happy and just in
      // case there's some edge case we missed.
      if (typeof moduleSpecifier !== 'string') {
        throw new InternalError(
          `import source ${String(moduleSpecifier)} is not a string`,
          {
            filePath,
            fileContents,
            node: statementNode.source,
          }
        );
      }

      // Now loop through each specifier in the import statement and parse it.
      // The specifier is `foo` in `import { foo } from './bar'`
      for (const specifierNode of statementNode.specifiers) {
        switch (specifierNode.type) {
          // import * as foo from 'bar';
          case TSESTree.AST_NODE_TYPES.ImportNamespaceSpecifier: {
            fileDetails.imports.push({
              type: 'barrelImport',
              filePath,
              statementNode,
              moduleSpecifier,
            });
            break;
          }

          // import foo from 'bar';
          case TSESTree.AST_NODE_TYPES.ImportDefaultSpecifier: {
            fileDetails.imports.push({
              type: 'singleImport',
              filePath,
              statementNode,
              specifierNode,
              moduleSpecifier,
              importName: 'default',
              importAlias: specifierNode.local.name,
              isTypeImport: statementNode.importKind === 'type',
            });
            break;
          }

          // import { foo } from 'bar';
          case TSESTree.AST_NODE_TYPES.ImportSpecifier: {
            const importName = getIdentifierOrStringValue(
              specifierNode.imported
            );

            fileDetails.imports.push({
              type: 'singleImport',
              filePath,
              statementNode,
              specifierNode,
              moduleSpecifier,
              importName,
              importAlias: specifierNode.local.name,
              isTypeImport: statementNode.importKind === 'type',
            });
            break;
          }

          // This shouldn't happen, but is here just in case
          default: {
            throw new UnknownNodeTypeError(
              filePath,
              fileContents,
              specifierNode
            );
          }
        }
      }
    },

    exportDeclaration(statementNode) {
      // Check if this is export { foo }, which parses very different
      if ('specifiers' in statementNode && statementNode.specifiers.length) {
        for (const specifierNode of statementNode.specifiers) {
          fileDetails.exports.push({
            type: 'export',
            filePath,
            statementNode,
            specifierNode: specifierNode.exported,
            exportName: getIdentifierOrStringValue(specifierNode.exported),
          });
        }
        return;
      }

      // TODO: Why would the declaration be undefined? Need to figure this out
      // and support whatever this edge case is
      if (!statementNode.declaration) {
        throw new InternalError(`export declaration is undefined`, {
          filePath,
          fileContents,
          node: statementNode,
        });
      }

      // If we got here we have a single export where we have to introspect the
      // declaration type to figure out what the name is. Note: we still want
      // to find the name in the case of default exports so that we can set
      // `specifierNode` to the name. Otherwise, when we highlight a lint error,
      // we would highlight entire classes/functions, which hurts readability
      switch (statementNode.declaration.type) {
        // export const ...
        case TSESTree.AST_NODE_TYPES.VariableDeclaration: {
          for (const declarationNode of statementNode.declaration
            .declarations) {
            switch (declarationNode.id.type) {
              // export const foo = 10;
              case TSESTree.AST_NODE_TYPES.Identifier: {
                fileDetails.exports.push({
                  type: 'export',
                  filePath,
                  statementNode,
                  specifierNode: declarationNode.id,
                  exportName: declarationNode.id.name,
                });
                break;
              }
              // export const [foo, bar] = [10, 10]
              case TSESTree.AST_NODE_TYPES.ArrayPattern: {
                walkExportDestructure(
                  filePath,
                  fileContents,
                  fileDetails,
                  statementNode,
                  declarationNode.id
                );
                break;
              }
              // export const { foo, bar } = { foo: 10, bar: 10 }
              case TSESTree.AST_NODE_TYPES.ObjectPattern: {
                walkExportDestructure(
                  filePath,
                  fileContents,
                  fileDetails,
                  statementNode,
                  declarationNode.id
                );
                break;
              }
              default: {
                throw new UnknownNodeTypeError(
                  filePath,
                  fileContents,
                  declarationNode.id
                );
              }
            }
          }
          break;
        }

        default: {
          // We don't use UnknownNodeTypeError here because this is typed as a
          // general declaration, which includes a bunch of statements that
          // actual exports don't support (and would be a syntax error), such as
          // `export import { foo } from 'bar'`
          throw new InternalError(
            `unsupported declaration type ${statementNode.declaration.type}`,
            {
              filePath,
              fileContents,
              node: statementNode.declaration,
            }
          );
        }
      }
    },
    reexportDeclaration(statementNode) {
      const moduleSpecifier = statementNode.source.value;

      // Check if this is a barrel reexport
      if (statementNode.type === TSESTree.AST_NODE_TYPES.ExportAllDeclaration) {
        fileDetails.reexports.push({
          type: 'barrelReexport',
          filePath,
          statementNode,
          moduleSpecifier,
          exportName: statementNode.exported?.name,
          isTypeReexport: statementNode.exportKind === 'type',
        });
        return;
      }

      // Otherwise, this is a single reexport, so we iterate through each specifier
      for (const specifierNode of statementNode.specifiers) {
        fileDetails.reexports.push({
          type: 'singleReexport',
          filePath,
          statementNode,
          specifierNode,
          moduleSpecifier,
          importName: getIdentifierOrStringValue(specifierNode.local),
          exportName: getIdentifierOrStringValue(specifierNode.exported),
          isTypeReexport: statementNode.exportKind === 'type',
        });
      }
    },
  });
  return fileDetails;
}
