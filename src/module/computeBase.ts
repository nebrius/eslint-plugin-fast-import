import type { BaseESMInfo, BaseFileDetails } from '@/types/base';
import { readdirSync, readFileSync } from 'fs';
import { extname, join } from 'path';
import { traverse } from './ast';

const VALID_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

export function computeBase(basepath: string): BaseESMInfo {
  const info: BaseESMInfo = {
    files: {},
  };

  const potentialFiles = readdirSync(basepath, {
    recursive: true,
    encoding: 'utf-8',
  });

  for (const potentialFilepath of potentialFiles) {
    if (VALID_EXTENSIONS.includes(extname(potentialFilepath))) {
      const filepath = join(basepath, potentialFilepath);
      info.files[filepath] = computeFileDetails(filepath);
    }
  }

  return info;
}

function computeFileDetails(filepath: string): BaseFileDetails {
  const fileDetails: BaseFileDetails = {
    type: 'esm',
    imports: [],
    exports: [],
    reexports: [],
  };

  console.log(`\n${filepath}\n`);
  const fileContents = readFileSync(filepath, 'utf-8');
  traverse({
    filepath,
    fileContents,
    importDeclaration(node) {
      console.log('import');
      console.log(fileContents.substring(node.range[0], node.range[1]));
      console.log('');
    },
    exportDeclaration(node) {
      console.log('export');
      console.log(fileContents.substring(node.range[0], node.range[1]));
      console.log('');
    },
    reexportDeclaration(node) {
      console.log('reexport');
      console.log(fileContents.substring(node.range[0], node.range[1]));
      console.log('');
    },
  });

  return fileDetails;
}
