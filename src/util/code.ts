import { extname } from 'node:path';

const VALID_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

export function isCodeFile(filePath: string) {
  return VALID_EXTENSIONS.includes(extname(filePath));
}
