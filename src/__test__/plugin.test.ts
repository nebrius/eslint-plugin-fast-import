// eslint-disable-next-line fast-import/no-entry-point-imports
import { all, recommended } from '../plugin.js';

describe('recommended', () => {
  it('sets consistent-file-extensions mode to "always" when requireFileExtensions is true', () => {
    const config = recommended({
      rootDir: '/test',
      requireFileExtensions: true,
    });

    expect(config.rules?.['fast-import/consistent-file-extensions']).toEqual([
      'error',
      { mode: 'always' },
    ]);
  });

  it('sets consistent-file-extensions mode to "never" when requireFileExtensions is false', () => {
    const config = recommended({
      rootDir: '/test',
      requireFileExtensions: false,
    });

    expect(config.rules?.['fast-import/consistent-file-extensions']).toEqual([
      'error',
      { mode: 'never' },
    ]);
  });

  it('sets consistent-file-extensions mode to "always" when requireFileExtensions is undefined', () => {
    const config = recommended({
      rootDir: '/test',
    });

    expect(config.rules?.['fast-import/consistent-file-extensions']).toEqual([
      'error',
      { mode: 'always' },
    ]);
  });
});

describe('all', () => {
  it('sets consistent-file-extensions mode to "always" when requireFileExtensions is true', () => {
    const config = all({
      rootDir: '/test',
      requireFileExtensions: true,
    });

    expect(config.rules?.['fast-import/consistent-file-extensions']).toEqual([
      'error',
      { mode: 'always' },
    ]);
  });

  it('sets consistent-file-extensions mode to "never" when requireFileExtensions is false', () => {
    const config = all({
      rootDir: '/test',
      requireFileExtensions: false,
    });

    expect(config.rules?.['fast-import/consistent-file-extensions']).toEqual([
      'error',
      { mode: 'never' },
    ]);
  });

  it('sets consistent-file-extensions mode to "always" when requireFileExtensions is undefined', () => {
    const config = all({
      rootDir: '/test',
    });

    expect(config.rules?.['fast-import/consistent-file-extensions']).toEqual([
      'error',
      { mode: 'always' },
    ]);
  });
});
