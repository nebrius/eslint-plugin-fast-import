import { getTextForRange } from './code.js';

type SourceDetails = {
  filePath: string;
  fileContents?: string;
  range: [number, number];
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
        formattedMessage += `\n\nIn ${sourceDetails.filePath}:\n\n${getTextForRange(sourceDetails.fileContents, sourceDetails.range)}\n`;
      } else {
        formattedMessage += `\n\nIn ${sourceDetails.filePath}\n`;
      }
    }
    super(formattedMessage);
  }
}
