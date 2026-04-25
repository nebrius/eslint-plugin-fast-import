// @ts-expect-error — cross-package import fixture
import type { A } from '@test/package-a';

export type B = A | string;
