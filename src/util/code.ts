import { extname } from 'node:path';

const VALID_EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs'];

export function isCodeFile(filePath: string) {
  return VALID_EXTENSIONS.includes(extname(filePath));
}
