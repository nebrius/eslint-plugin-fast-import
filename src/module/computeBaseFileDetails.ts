import { TSESTree } from '@typescript-eslint/typescript-estree';

import type { BaseCodeFileDetails } from '../types/base.js';
import { InternalError } from '../util/error.js';
import { type ExportDeclaration, traverse } from './util.js';

// Exports are almost always identifiers, but on rare occasions they can
// actually be strings, such as in:
//
// const x = 10;
// export { x as 'some string' };
//
// We actually don't care if the name is an identifier or string though, so this
// function normalizes the value
function getIdentifierOrStringValue(
  node: TSESTree.Identifier | TSESTree.StringLiteral
) {
  return node.type === TSESTree.AST_NODE_TYPES.Identifier
    ? node.name
    : node.value;
}

function isDefault(
  statementNode: ExportDeclaration
): statementNode is TSESTree.ExportDefaultDeclaration {
  return (
    statementNode.type === TSESTree.AST_NODE_TYPES.ExportDefaultDeclaration
  );
}

/* istanbul ignore next */
class UnknownNodeTypeError extends InternalError {
  constructor(filePath: string, fileContents: string, node: never) {
    super(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      `unknown AST node type ${(node as any).type}`,
      {
        filePath,
        fileContents,
        range: (node as unknown as TSESTree.Node).range,
      }
    );
  }
}

function getRangeOfDefaultToken(
  node: TSESTree.Node,
  tokens: TSESTree.Token[] | undefined,
  filePath: string
) {
  /* istanbul ignore if */
  if (!tokens) {
    throw new InternalError(`tokens is unexpectedly undefined`);
  }
  for (const token of tokens) {
    if (token.range[0] < node.range[0] || token.range[1] > node.range[1]) {
      continue;
    }
    if (
      token.type === TSESTree.AST_TOKEN_TYPES.Keyword &&
      token.value === 'default'
    ) {
      return token.range;
    }
  }
  /* istanbul ignore next */
  throw new InternalError('Could not get report nore', {
    filePath,
    range: node.range,
  });
}

// This helper walks export destructure, which is by far the most complicated
// part of parsing exports because destructures can be destructured recursively,
// e.g. `export const [ [ { something } ] ] = [ [ { something: 10 } ] ]`
function walkExportDestructure(
  filePath: string,
  fileContents: string,
  fileDetails: BaseCodeFileDetails,
  statementNode: ExportDeclaration,
  node: TSESTree.DestructuringPattern,
  isEntryPointCheck: IsEntryPointCheck
) {
  switch (node.type) {
    // export const [ foo, bar ] = []
    case TSESTree.AST_NODE_TYPES.ArrayPattern: {
      for (const elementNode of node.elements) {
        // Check if this is an array hole, e.g. `[a, , b]`, and if so skip
        if (elementNode) {
          walkExportDestructure(
            filePath,
            fileContents,
            fileDetails,
            statementNode,
            elementNode,
            isEntryPointCheck
          );
        }
      }
      break;
    }

    // export const { ... } = {}
    case TSESTree.AST_NODE_TYPES.ObjectPattern: {
      for (const propertyNode of node.properties) {
        // First check if this is a spread, in which case we directly recurse
        if (propertyNode.type === TSESTree.AST_NODE_TYPES.RestElement) {
          walkExportDestructure(
            filePath,
            fileContents,
            fileDetails,
            statementNode,
            propertyNode,
            isEntryPointCheck
          );
          continue;
        }

        // Otherwise, we need to introspect on what's going on here
        switch (propertyNode.value.type) {
          // export const { foo } = {}
          case TSESTree.AST_NODE_TYPES.Identifier: {
            fileDetails.exports.push({
              statementNodeRange: statementNode.range,
              reportNodeRange: propertyNode.value.range,
              exportName: propertyNode.value.name,
              isTypeExport: statementNode.exportKind === 'type',
              isEntryPoint: isEntryPointCheck(
                filePath,
                propertyNode.value.name
              ),
            });
            break;
          }

          // Cases where we need to recurse
          case TSESTree.AST_NODE_TYPES.ArrayPattern:
          case TSESTree.AST_NODE_TYPES.ObjectPattern: {
            walkExportDestructure(
              filePath,
              fileContents,
              fileDetails,
              statementNode,
              propertyNode.value,
              isEntryPointCheck
            );
            break;
          }

          /* istanbul ignore next */
          default: {
            // We don't use UnknownNodeTypeError here because this is typed as a
            // general property definition, which includes a bunch of statements
            // that actual exports don't support (and would be a syntax error),
            // such as: `export const { foo: doThing() }`
            throw new InternalError(
              `unsupported declaration type ${propertyNode.value.type}`,
              {
                filePath,
                fileContents,
                range: propertyNode.value.range,
              }
            );
          }
        }
      }
      break;
    }

    // export const [ foo = 10 ] = [ 10 ]
    case TSESTree.AST_NODE_TYPES.AssignmentPattern: {
      if (node.left.type === TSESTree.AST_NODE_TYPES.Identifier) {
        fileDetails.exports.push({
          statementNodeRange: statementNode.range,
          reportNodeRange: node.left.range,
          exportName: node.left.name,
          isTypeExport: statementNode.exportKind === 'type',
          isEntryPoint: isEntryPointCheck(filePath, node.left.name),
        });
      }
      // It's possible to do `export const [ { foo } = {} ]`
      else {
        walkExportDestructure(
          filePath,
          fileContents,
          fileDetails,
          statementNode,
          node.left,
          isEntryPointCheck
        );
      }
      break;
    }

    // export const [ foo ] = [ 10 ]
    case TSESTree.AST_NODE_TYPES.Identifier: {
      fileDetails.exports.push({
        statementNodeRange: statementNode.range,
        reportNodeRange: node.range,
        exportName: node.name,
        isTypeExport: statementNode.exportKind === 'type',
        isEntryPoint: isEntryPointCheck(filePath, node.name),
      });
      break;
    }

    // AFAICT this isn't actually valid, since it would imply
    // `export const { foo.bar }`, but I'm not 100% certain.
    // See: https://github.com/estree/estree/issues/162
    /* istanbul ignore next */
    case TSESTree.AST_NODE_TYPES.MemberExpression: {
      throw new InternalError(
        `unexpected member expression in array destructure`,
        { filePath, fileContents, range: node.range }
      );
    }

    // export const [ ... ]
    case TSESTree.AST_NODE_TYPES.RestElement: {
      walkExportDestructure(
        filePath,
        fileContents,
        fileDetails,
        statementNode,
        node.argument,
        isEntryPointCheck
      );
      break;
    }

    default: {
      throw new UnknownNodeTypeError(filePath, fileContents, node);
    }
  }
}

type IsEntryPointCheck = (filePath: string, symbolName: string) => boolean;

type ComputeFileDetailsOptions = {
  filePath: string;
  fileContents: string;
  ast: TSESTree.Program;
  isEntryPointCheck: IsEntryPointCheck;
};

export function computeFileDetails({
  filePath,
  fileContents,
  ast,
  isEntryPointCheck,
}: ComputeFileDetailsOptions): BaseCodeFileDetails {
  const fileDetails: BaseCodeFileDetails = {
    fileType: 'code',
    lastUpdatedAt: Date.now(),
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
      /* istanbul ignore if */
      if (
        typeof moduleSpecifier !== 'string' &&
        typeof moduleSpecifier !== 'undefined'
      ) {
        throw new InternalError(
          `Import source ${String(moduleSpecifier)} is not a string or undefined`,
          {
            filePath,
            fileContents,
            range: statementNode.source.range,
          }
        );
      }

      // We check if this is a dynamic import first, since it's the only type of
      // import that may not have a string module specifier.
      if (statementNode.type === TSESTree.AST_NODE_TYPES.ImportExpression) {
        fileDetails.imports.push({
          statementNodeRange: statementNode.range,
          reportNodeRange: statementNode.range,
          importType: 'dynamic',
          moduleSpecifier,
        });
        return;
      }

      // Now that we know this isn't a dynamic import, we can enforce that the
      // module specifier is a string. In practice this should always be a
      // string at this point, but we check to make TypeScript happy and just in
      // case there's some edge case we missed.
      /* istanbul ignore if */
      if (typeof moduleSpecifier !== 'string') {
        throw new InternalError(
          `import source ${String(moduleSpecifier)} is not a string`,
          {
            filePath,
            fileContents,
            range: statementNode.source.range,
          }
        );
      }

      // Now loop through each specifier in the import statement and parse it.
      // The specifier is `foo` in: `import { foo } from './bar'`
      for (const specifierNode of statementNode.specifiers) {
        switch (specifierNode.type) {
          // import * as foo from 'bar';
          case TSESTree.AST_NODE_TYPES.ImportNamespaceSpecifier: {
            fileDetails.imports.push({
              statementNodeRange: statementNode.range,
              reportNodeRange: specifierNode.range,
              importType: 'barrel',
              moduleSpecifier,
              isTypeImport: statementNode.importKind === 'type',
              importAlias: specifierNode.local.name,
            });
            break;
          }

          // import foo from 'bar';
          case TSESTree.AST_NODE_TYPES.ImportDefaultSpecifier: {
            fileDetails.imports.push({
              statementNodeRange: statementNode.range,
              reportNodeRange: specifierNode.range,
              importType: 'single',
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
              statementNodeRange: statementNode.range,
              reportNodeRange: specifierNode.range,
              importType: 'single',
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

    exportDeclaration(statementNode, parentNode) {
      // If we're inside of a module declaration, don't continue on since we
      // don't analyze namespaces
      if (
        parentNode &&
        (parentNode.type === TSESTree.AST_NODE_TYPES.TSModuleDeclaration ||
          parentNode.type === TSESTree.AST_NODE_TYPES.TSModuleBlock)
      ) {
        return;
      }

      // Check if this is export { foo }, which parses very different
      if ('specifiers' in statementNode && statementNode.specifiers.length) {
        for (const specifierNode of statementNode.specifiers) {
          const exportName = getIdentifierOrStringValue(specifierNode.exported);
          fileDetails.exports.push({
            statementNodeRange: statementNode.range,
            reportNodeRange: specifierNode.exported.range,
            exportName,
            isTypeExport: statementNode.exportKind === 'type',
            isEntryPoint: isEntryPointCheck(filePath, exportName),
          });
        }
        return;
      }

      // This happens when we do `export {}`
      if (!statementNode.declaration) {
        return;
      }

      // If we got here we have a single export where we have to introspect the
      // declaration type to figure out what the name is. Note: we still want to
      // find the name in the case of default exports so that we can set
      // `specifierNode` to the name. Otherwise, when we highlight a lint error,
      // we would highlight entire classes/functions, which hurts readability
      switch (statementNode.declaration.type) {
        // export const ...
        // Note: const exports can't be default
        case TSESTree.AST_NODE_TYPES.VariableDeclaration: {
          for (const declarationNode of statementNode.declaration
            .declarations) {
            switch (declarationNode.id.type) {
              // export const foo = 10;
              case TSESTree.AST_NODE_TYPES.Identifier: {
                fileDetails.exports.push({
                  statementNodeRange: statementNode.range,
                  reportNodeRange: declarationNode.id.range,
                  exportName: declarationNode.id.name,
                  isTypeExport: statementNode.exportKind === 'type',
                  isEntryPoint: isEntryPointCheck(
                    filePath,
                    declarationNode.id.name
                  ),
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
                  declarationNode.id,
                  isEntryPointCheck
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
                  declarationNode.id,
                  isEntryPointCheck
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

        // export interface Foo {} or export type Foo = string
        case TSESTree.AST_NODE_TYPES.TSInterfaceDeclaration:
        case TSESTree.AST_NODE_TYPES.TSEnumDeclaration:
        case TSESTree.AST_NODE_TYPES.TSTypeAliasDeclaration: {
          const exportName = isDefault(statementNode)
            ? 'default'
            : statementNode.declaration.id.name;
          fileDetails.exports.push({
            statementNodeRange: statementNode.range,
            reportNodeRange: statementNode.declaration.id.range,
            exportName,
            isTypeExport: true,
            isEntryPoint: isEntryPointCheck(filePath, exportName),
          });
          break;
        }

        // export function foo() {}
        case TSESTree.AST_NODE_TYPES.TSDeclareFunction:
        case TSESTree.AST_NODE_TYPES.FunctionDeclaration: {
          if (isDefault(statementNode)) {
            fileDetails.exports.push({
              statementNodeRange: statementNode.range,
              reportNodeRange: statementNode.declaration.id
                ? statementNode.declaration.id.range
                : statementNode.range,
              exportName: 'default',
              isTypeExport: false, // functions can never be types
              isEntryPoint: isEntryPointCheck(filePath, 'default'),
            });
          } else {
            // TODO: I'm pretty certain that declaration id missing means that
            // this is a function expression, aka `export function () {}` which
            // isn't allowed in an export statement
            /* istanbul ignore if */
            if (!statementNode.declaration.id) {
              throw new InternalError(`function id is unexpectedly missing`, {
                filePath,
                fileContents,
                range: statementNode.declaration.range,
              });
            }
            fileDetails.exports.push({
              statementNodeRange: statementNode.range,
              reportNodeRange: statementNode.declaration.id.range,
              exportName: statementNode.declaration.id.name,
              isTypeExport: statementNode.exportKind === 'type',
              isEntryPoint: isEntryPointCheck(
                filePath,
                statementNode.declaration.id.name
              ),
            });
          }

          break;
        }

        // export class Foo {}
        case TSESTree.AST_NODE_TYPES.ClassDeclaration: {
          if (isDefault(statementNode)) {
            fileDetails.exports.push({
              statementNodeRange: statementNode.range,
              reportNodeRange: statementNode.declaration.id
                ? statementNode.declaration.id.range
                : statementNode.range,
              exportName: 'default',
              isTypeExport: false, // Classes can never be types
              isEntryPoint: isEntryPointCheck(filePath, 'default'),
            });
          } else {
            if (!statementNode.declaration.id) {
              throw new Error(
                'Exporting non-default unnamed classes is not supported (e.g. `export class {}`)'
              );
            }
            fileDetails.exports.push({
              statementNodeRange: statementNode.range,
              reportNodeRange: statementNode.declaration.id.range,
              exportName: statementNode.declaration.id.name,
              isTypeExport: statementNode.exportKind === 'type',
              isEntryPoint: isEntryPointCheck(
                filePath,
                statementNode.declaration.id.name
              ),
            });
          }
          break;
        }

        // export default foo
        case TSESTree.AST_NODE_TYPES.Identifier: {
          const { name } = statementNode.declaration;
          const isNodeDefault = isDefault(statementNode);
          const exportName = isNodeDefault ? 'default' : name;
          fileDetails.exports.push({
            statementNodeRange: statementNode.range,
            reportNodeRange: statementNode.declaration.range,
            exportName,
            isTypeExport: statementNode.exportKind === 'type',
            isEntryPoint: isEntryPointCheck(filePath, exportName),
          });
          break;
        }

        // export namespace {}
        // export module {}
        case TSESTree.AST_NODE_TYPES.TSModuleDeclaration: {
          let exportName: string;
          const { id } = statementNode.declaration;
          switch (id.type) {
            // export namespace {}
            case TSESTree.AST_NODE_TYPES.Identifier: {
              exportName = id.name;
              break;
            }
            // export module {}
            case TSESTree.AST_NODE_TYPES.Literal: {
              exportName = id.value;
              break;
            }
            case TSESTree.AST_NODE_TYPES.TSQualifiedName: {
              throw new InternalError(
                `Unsupported module declaration identifier ${id.type}`
              );
            }
          }
          fileDetails.exports.push({
            statementNodeRange: statementNode.range,
            reportNodeRange: statementNode.declaration.range,
            exportName,
            isTypeExport: true,
            isEntryPoint: isEntryPointCheck(filePath, exportName),
          });
          break;
        }

        // export import Foo = Bar;
        case TSESTree.AST_NODE_TYPES.TSImportEqualsDeclaration: {
          const exportName = statementNode.declaration.id.name;
          fileDetails.exports.push({
            statementNodeRange: statementNode.range,
            reportNodeRange: statementNode.declaration.range,
            exportName,
            isTypeExport: statementNode.exportKind === 'type',
            isEntryPoint: isEntryPointCheck(filePath, exportName),
          });
          break;
        }

        default: {
          // First we check if this is a default export, since we can still
          // process it, even if we can't select a particularly useful specifier
          // node
          if (isDefault(statementNode)) {
            fileDetails.exports.push({
              statementNodeRange: statementNode.range,
              reportNodeRange: getRangeOfDefaultToken(
                statementNode,
                ast.tokens,
                filePath
              ),
              exportName: 'default',
              isTypeExport: false, // For some reason
              isEntryPoint: isEntryPointCheck(filePath, 'default'),
            });
            break;
          }

          throw new UnknownNodeTypeError(
            filePath,
            fileContents,
            statementNode.declaration
          );
        }
      }
    },

    reexportDeclaration(statementNode, parentNode) {
      // If we're inside of a module declaration, don't continue on since we
      // don't analyze namespaces
      if (
        parentNode &&
        parentNode.type === TSESTree.AST_NODE_TYPES.TSModuleDeclaration
      ) {
        return;
      }

      const moduleSpecifier = statementNode.source.value;

      // Check if this is a barrel reexport
      if (statementNode.type === TSESTree.AST_NODE_TYPES.ExportAllDeclaration) {
        const exportName = statementNode.exported?.name;
        fileDetails.reexports.push({
          statementNodeRange: statementNode.range,
          reportNodeRange: statementNode.range,
          reexportType: 'barrel',
          moduleSpecifier,
          exportName,
          isTypeReexport: statementNode.exportKind === 'type',
          isEntryPoint: exportName
            ? isEntryPointCheck(filePath, exportName)
            : false,
        });
        return;
      }

      // Otherwise this is a single reexport, so we iterate through each specifier
      for (const specifierNode of statementNode.specifiers) {
        const exportName = getIdentifierOrStringValue(specifierNode.exported);
        fileDetails.reexports.push({
          statementNodeRange: statementNode.range,
          reportNodeRange: specifierNode.range,
          reexportType: 'single',
          moduleSpecifier,
          importName: getIdentifierOrStringValue(specifierNode.local),
          exportName,
          isTypeReexport: statementNode.exportKind === 'type',
          isEntryPoint: isEntryPointCheck(filePath, exportName),
        });
      }
    },
  });
  return fileDetails;
}
