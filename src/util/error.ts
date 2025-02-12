import type { TSESTree } from '@typescript-eslint/utils';

type SourceDetails = {
  filePath: string;
  fileContents: string;
  node: TSESTree.Node;
};

export class InternalError extends Error {
  constructor(message: string, sourceDetails?: SourceDetails) {
    let formattedMessage = `Internal error: ${message}. This is a bug, please report the message and the stack trace to the maintainer at https://github.com/nebrius/esm-lint/issues`;
    if (sourceDetails) {
      formattedMessage += `\n\nIn ${sourceDetails.filePath}:\n${sourceDetails.fileContents.substring(sourceDetails.node.range[0], sourceDetails.node.range[1])}\n`;
    }
    super(formattedMessage);
  }
}
