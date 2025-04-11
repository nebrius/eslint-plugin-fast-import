import { getDirname } from 'cross-dirname';
import { join } from 'node:path';
import type { ParsedSettings } from '../../settings.js';
import { getSettings } from '../../settings.js';

const TEST_PROJECT_DIR = join(getDirname(), 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'src', 'a.ts');

it('Fetchings settings from typescript', () => {
  const settings = getSettings({
    filename: FILE_A,
    settings: {
      'fast-import': {
        mode: 'one-shot',
      },
    },
  });
  const expected: ParsedSettings = {
    editorUpdateRate: 5_000,
    rootDir: join(TEST_PROJECT_DIR, 'src'),
    entryPoints: [],
    mode: 'one-shot',
    ignorePatterns: [],
    wildcardAliases: {
      '@/': join(TEST_PROJECT_DIR, 'src/'),
    },
    fixedAliases: {
      '@a': FILE_A,
    },
  };
  expect(settings).toEqual(expected);
});
