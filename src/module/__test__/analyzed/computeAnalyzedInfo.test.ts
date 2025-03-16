import { join } from 'path';
import { stripNodes } from '../util';
import { computeAnalyzedInfo } from '../../computeAnalyzedInfo';
import { computeResolvedInfo } from '../../computeResolvedInfo';
import { computeBaseInfo } from '../../computeBaseInfo';

const TEST_PROJECT_DIR = join(__dirname, 'project');
// const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');

it('Computes base info', () => {
  const info = computeAnalyzedInfo(
    computeResolvedInfo(
      computeBaseInfo({
        sourceRoot: TEST_PROJECT_DIR,
        rootImportAlias: '@',
        allowAliaslessRootImports: true,
      })
    )
  );
  console.log(JSON.stringify(stripNodes(info), null, '  '));
});
