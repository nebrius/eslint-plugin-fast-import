import type { TSESTree } from '@typescript-eslint/utils';

type SourceDetails = {
  filePath: string;
  fileContents?: string;
  node: TSESTree.Node;
};

/**
 * An error class that adds special formatting for internal errors, including printing out what file and AST node was
 * being processed when the error occured
 */
export class InternalError extends Error {
  constructor(message: string, sourceDetails?: SourceDetails) {
    let formattedMessage = `Internal error: ${message}. This is a bug, please report the message and the stack trace to the maintainer at https://github.com/nebrius/fast-esm/issues`;
    if (sourceDetails) {
      if (sourceDetails.fileContents) {
        formattedMessage += `\n\nIn ${sourceDetails.filePath}:\n\n${sourceDetails.fileContents.substring(sourceDetails.node.range[0], sourceDetails.node.range[1])}\n`;
      } else {
        formattedMessage += `\n\nIn ${sourceDetails.filePath}\n`;
      }
    }
    super(formattedMessage);
  }
}
