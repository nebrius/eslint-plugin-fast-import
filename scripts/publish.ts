import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import readLine from 'node:readline/promises';

import { spawn } from 'child_process';
import { getDirname } from 'cross-dirname';
import { simpleGit } from 'simple-git';

const ROOT_DIR = resolve(getDirname(), '..');
const DRY_RUN = process.argv.includes('--dry-run');

const version = JSON.parse(
  readFileSync(join(getDirname(), '..', 'package.json'), 'utf-8')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
).version as string;

const git = simpleGit(ROOT_DIR);

if (DRY_RUN) {
  console.log(`Performing dry run of publishing version ${version}`);
} else {
  const rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const response = await rl.question(
    `Actually publishing version ${version} to npm. Are you sure [y/N]? `
  );
  if (response !== 'y' && response !== 'Y') {
    process.exit(-1);
  }
  rl.close();
}

if (!(await git.status()).isClean()) {
  console.error(`Git status is not clean`);
  if (!DRY_RUN) {
    process.exit(-1);
  }
}

function runStep(command: string, args: string[]): Promise<void> {
  return new Promise((resolve) => {
    spawn(command, args, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    }).on('exit', (code) => {
      if (code) {
        if (!DRY_RUN) {
          process.exit(-1);
        }
      }
      resolve();
    });
  });
}

// build
await runStep('npm', ['run', 'build']);

// lint
await runStep('npm', ['run', 'lint']);

// test
await runStep('npm', ['run', 'test']);

// npm publish
if (DRY_RUN) {
  await runStep('npm', ['publish', '--dry-run']);
} else {
  await runStep('npm', ['publish']);
}

// git tag
console.log(`Tagging git with version ${version}`);
if (!DRY_RUN) {
  await git.addAnnotatedTag(version, `Published v${version} to npm`);
}

// git push
console.log(`Pushing tags to GitHub`);
if (!DRY_RUN) {
  await git.pushTags();
}
