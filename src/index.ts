import { join } from 'path';
import { computeBase } from './module/computeBase';
import { noUnusedExports } from './rules/unused';

export const rules = {
  'no-unused-exports': noUnusedExports,
};

computeBase(join(__dirname, '..', 'src'));
