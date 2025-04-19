import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';

import { getDirname } from 'cross-dirname';

const ROOT_DIR = resolve(getDirname(), '..');

function formatDuration(duration: number) {
  const roundedDuration = Math.round(duration * 10) / 10;
  return `${roundedDuration.toLocaleString().padStart(8, ' ')}ms`;
}

type RuleSet = {
  unused: string;
  cycle: string;
  unresolved: string;
};

async function runLint(
  config: string,
  { unused, cycle, unresolved }: RuleSet
): Promise<RuleSet & { total: string }> {
  return new Promise((resolve) => {
    const proc = spawn(
      '/opt/homebrew/bin/node',
      [join(ROOT_DIR, 'node_modules/.bin/eslint'), '-c', config, 'src/**/*'],
      {
        cwd: ROOT_DIR,
        env: {
          TIMING: '1',
        },
      }
    );

    let data = '';
    proc.stdout.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      console.error(chunk.toString());
    });

    proc.on('exit', () => {
      const lines = data.split('\n');
      const unusedRegex = new RegExp(`^${unused}\\s*\\|\\s*([0-9\\.]*)\\s\\|`);
      const cycleRegex = new RegExp(`^${cycle}\\s*\\|\\s*([0-9\\.]*)\\s\\|`);
      const unresolvedRegex = new RegExp(
        `^${unresolved}\\s*\\|\\s*([0-9\\.]*)\\s\\|`
      );
      let unusedTime: number | undefined;
      let cycleTime: number | undefined;
      let unresolvedTime: number | undefined;
      for (const line of lines) {
        const unusedMatch = unusedRegex.exec(line);
        if (unusedMatch) {
          if (unusedTime !== undefined) {
            throw new Error('Unused output already found');
          }
          unusedTime = parseFloat(unusedMatch[1]);
        }
        const cycleMatch = cycleRegex.exec(line);
        if (cycleMatch) {
          if (cycleTime !== undefined) {
            throw new Error('Cycle output already found');
          }
          cycleTime = parseFloat(cycleMatch[1]);
        }
        const unresolvedMatch = unresolvedRegex.exec(line);
        if (unresolvedMatch) {
          if (unresolvedTime !== undefined) {
            throw new Error('Unresolved output already found');
          }
          unresolvedTime = parseFloat(unresolvedMatch[1]);
        }
      }
      if (!unusedTime || !cycleTime || !unresolvedTime) {
        throw new Error('Could not find all rule times in output');
      }
      resolve({
        unused: formatDuration(unusedTime),
        cycle: formatDuration(cycleTime),
        unresolved: formatDuration(unresolvedTime),
        total: formatDuration(unusedTime + cycleTime),
      });
    });
  });
}

console.log(
  'npx ' +
    [
      'eslint',
      '-c',
      join(getDirname(), 'compareConfigs/eslint.perf.fast-import.config.mjs'),
      'src/**/*',
    ].join(' ')
);

console.log(`Running Fast Import`);

const fastImportTime = await runLint('eslint.perf.fast-import.config.mjs', {
  unused: 'fast-import/no-unused-exports',
  cycle: 'fast-import/no-cycle',
  unresolved: 'fast-import/no-missing-imports',
});

console.log(`Running Import`);
const importTime = await runLint('eslint.perf.import.config.mjs', {
  unused: 'import/no-unused-modules',
  cycle: 'import/no-cycle',
  unresolved: 'import/no-unresolved',
});

console.log(`Running Import X`);
const importXTime = await runLint('eslint.perf.import-x.config.mjs', {
  unused: 'import-x/no-unused-modules',
  cycle: 'import-x/no-cycle',
  unresolved: 'import-x/no-unresolved',
});

console.log(`
            | Unused     | Cycle      | Unresolved | Total      |
------------|------------|------------|------------|------------|
Fast Import | ${fastImportTime.unused} | ${fastImportTime.cycle} | ${fastImportTime.unresolved} | ${fastImportTime.total} |
Import      | ${importTime.unused} | ${importTime.cycle} | ${importTime.unresolved} | ${importTime.total} |
Import X    | ${importXTime.unused} | ${importXTime.cycle} | ${importXTime.unresolved} | ${importXTime.total} |`);
