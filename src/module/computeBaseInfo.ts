import type { BaseESMInfo, BaseFileDetails } from '@/types/base';
import { readdirSync } from 'fs';
import { extname, join } from 'path';
import { parseFile, traverse } from './ast';
import { TSESTree } from '@typescript-eslint/utils';
import { InternalError } from '../util/error';

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
}): BaseFileDetails {
  const fileDetails: BaseFileDetails = {
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
            throw new InternalError(
              `unknown import specifier type ${statementNode.type}`,
              { filePath, fileContents, node: statementNode }
            );
          }
        }
      }
    },
    exportDeclaration() {
      //
    },
    reexportDeclaration(statementNode) {
      const moduleSpecifier = statementNode.source.value;

      // Check if this is a barrel reexport, and if so save it
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

      // Otherwise, this is a single reexport, so we iterate through export specifiers
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
