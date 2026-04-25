// @ts-expect-error — cross-package import fixture
import type { B } from '@test/package-b/b';

export type A = B;
