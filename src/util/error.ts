import type { TSESTree } from '@typescript-eslint/utils';

type SourceDetails = {
  filePath: string;
  fileContents?: string;
  range: TSESTree.Node['range'];
};

/**
 * An error class that adds special formatting for internal errors, including printing out what file and AST node was
 * being processed when the error occured
 */
/* istanbul ignore next */
export class InternalError extends Error {
  constructor(message: string, sourceDetails?: SourceDetails) {
    let formattedMessage = `Internal error: ${message}. This is a bug, please report the message and the stack trace to the maintainer at https://github.com/nebrius/fast-import/issues`;
    if (sourceDetails) {
      if (sourceDetails.fileContents) {
        formattedMessage += `\n\nIn ${sourceDetails.filePath}:\n\n${sourceDetails.fileContents.substring(sourceDetails.range[0], sourceDetails.range[1])}\n`;
      } else {
        formattedMessage += `\n\nIn ${sourceDetails.filePath}\n`;
      }
    }
    super(formattedMessage);
  }
}
