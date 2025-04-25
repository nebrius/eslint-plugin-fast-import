import { extname } from 'node:path';

const VALID_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
];

export function isCodeFile(filePath: string) {
  return VALID_EXTENSIONS.includes(extname(filePath));
}

export function getTextForRange(fileContents: string, range: [number, number]) {
  return fileContents.substring(range[0], range[1]);
}
