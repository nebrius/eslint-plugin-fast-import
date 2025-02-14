import { join } from 'path';
import { stripNodes } from '../util';
import { computeResolvedInfo } from '../../computeResolvedInfo';
import { computeBaseInfo } from '../../computeBaseInfo';

const TEST_PROJECT_DIR = join(__dirname, 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'one', 'b.ts');
const FILE_C = join(TEST_PROJECT_DIR, 'one', 'c', 'index.ts');
const FILE_D = join(TEST_PROJECT_DIR, 'two', 'd.js');
const FILE_D_DECLARATION = join(TEST_PROJECT_DIR, 'two', 'd.d.ts');

describe('computes base info', () => {
  it('does a thing', () => {
    const info = computeResolvedInfo(
      computeBaseInfo({
        sourceRoot: TEST_PROJECT_DIR,
        rootImportAlias: '@',
        allowAliaslessRootImports: false,
      })
    );

    expect(stripNodes(info)).toEqual({
      rootImportAlias: '@',
      sourceRoot: TEST_PROJECT_DIR,
      allowAliaslessRootImports: false,
      files: {
        [FILE_A]: {
          type: 'esm',
          imports: [],
          exports: [],
          reexports: [],
        },
        [FILE_B]: {
          type: 'esm',
          imports: [],
          exports: [],
          reexports: [],
        },
        [FILE_C]: {
          type: 'esm',
          imports: [],
          exports: [],
          reexports: [],
        },
        [FILE_D]: {
          type: 'esm',
          imports: [],
          exports: [],
          reexports: [],
        },
        [FILE_D_DECLARATION]: {
          type: 'esm',
          imports: [],
          exports: [],
          reexports: [],
        },
      },
    });
  });
});
