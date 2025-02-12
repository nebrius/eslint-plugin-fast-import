import type { BaseESMInfo, BaseFileDetails } from '@/types/base';
import { readdirSync, readFileSync } from 'fs';
import { extname, join } from 'path';
import { traverse } from './ast';
import { TSESTree } from '@typescript-eslint/utils';
import { InternalError } from '../util/error';

const VALID_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

export function computeBase(basepath: string): BaseESMInfo {
  const info: BaseESMInfo = {
    files: {},
  };

  const potentialFiles = readdirSync(basepath, {
    recursive: true,
    encoding: 'utf-8',
  });

  for (const potentialFilePath of potentialFiles) {
    if (VALID_EXTENSIONS.includes(extname(potentialFilePath))) {
      const filePath = join(basepath, potentialFilePath);
      info.files[filePath] = computeFileDetails(filePath);
    }
  }

  return info;
}

function computeFileDetails(filePath: string): BaseFileDetails {
  const fileDetails: BaseFileDetails = {
    type: 'esm',
    imports: [],
    exports: [],
    reexports: [],
  };

  const fileContents = readFileSync(filePath, 'utf-8');
  traverse({
    filePath,
    fileContents,
    importDeclaration(node) {
      if (node.source.type !== TSESTree.AST_NODE_TYPES.Literal) {
        throw new InternalError(
          `unknown import source type ${node.source.type}`,
          {
            filePath,
            fileContents,
            node: node.source,
          }
        );
      }
      if (typeof node.source.value !== 'string') {
        throw new InternalError(
          `import source ${String(node.source.value)} is not a string`,
          {
            filePath,
            fileContents,
            node: node.source,
          }
        );
      }
      const moduleSpecifier = node.source.value;
      if (node.type === TSESTree.AST_NODE_TYPES.ImportExpression) {
        fileDetails.imports.push({
          type: 'dynamicImport',
          filePath,
          importStatementRange: node.range,
          moduleSpecifier,
        });
        return;
      }
      for (const specifier of node.specifiers) {
        switch (specifier.type) {
          case TSESTree.AST_NODE_TYPES.ImportNamespaceSpecifier: {
            fileDetails.imports.push({
              type: 'barrelImport',
              filePath,
              importStatementRange: node.range,
              importSpecifierRange: specifier.range,
              moduleSpecifier,
            });
            break;
          }
          case TSESTree.AST_NODE_TYPES.ImportDefaultSpecifier: {
            fileDetails.imports.push({
              type: 'singleImport',
              filePath,
              importStatementRange: node.range,
              importSpecifierRange: specifier.range,
              moduleSpecifier,
              importName: 'default',
              importAlias: specifier.local.name,
              isTypeImport: node.importKind === 'type',
            });
            break;
          }
          case TSESTree.AST_NODE_TYPES.ImportSpecifier: {
            const importName =
              specifier.imported.type === TSESTree.AST_NODE_TYPES.Identifier
                ? specifier.imported.name
                : specifier.imported.value;
            fileDetails.imports.push({
              type: 'singleImport',
              filePath,
              importStatementRange: node.range,
              importSpecifierRange: specifier.range,
              moduleSpecifier,
              importName,
              importAlias: specifier.local.name,
              isTypeImport: node.importKind === 'type',
            });
            break;
          }
          default: {
            throw new InternalError(
              `unknown import specifier type ${node.type}`
            );
          }
        }
      }
    },
    exportDeclaration() {
      //
    },
    reexportDeclaration() {
      //
    },
  });
  return fileDetails;
}
