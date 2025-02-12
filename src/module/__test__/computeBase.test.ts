import { join } from 'path';
import { computeBase } from '../computeBase';

const TEST_PROJECT_DIR = join(__dirname, 'project');

describe('computes base info', () => {
  it('does a thing', () => {
    const info = computeBase(TEST_PROJECT_DIR);
    expect(info).toEqual({
      files: {
        [join(TEST_PROJECT_DIR, 'a.ts')]: {
          exports: [],
          imports: [],
          reexports: [],
          type: 'esm',
        },
      },
    });
  });
});
