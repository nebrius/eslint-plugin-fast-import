// @ts-expect-error — cross-package import fixture
import { utils } from '@test/package-d/d';

export const C = utils;
