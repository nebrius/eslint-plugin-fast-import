import { getDirname } from 'cross-dirname';
import { join, resolve } from 'node:path';
import { getFiles } from '../files.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const ROOT_DIR = resolve(join(getDirname(), '..', '..', '..'));

it('Fetchings files asynchronously', async () => {
  const files = await getFiles(join(TEST_PROJECT_DIR, 'src'), [
    { dir: join(TEST_PROJECT_DIR, 'src'), contents: 'src/c.ts' },
  ]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  expect(files.files.map(({ latestUpdatedAt, ...rest }) => rest)).toEqual([
    {
      filePath: join(TEST_PROJECT_DIR, 'src/a.ts'),
    },
    {
      filePath: join(TEST_PROJECT_DIR, 'src/b.ts'),
    },
  ]);

  expect(files.packageJsons).toEqual([
    join(TEST_PROJECT_DIR, '/package.json'),
    join(ROOT_DIR, 'package.json'),
  ]);
});
