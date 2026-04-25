// @ts-expect-error — cross-package import fixture
import type { Fa } from '@test/package-f/a';
// @ts-expect-error — cross-package import fixture; bare specifier does not match any registered entry point
import * as bareF from '@test/package-f';
// @ts-expect-error — cross-package import fixture; dynamic entry-point match
import type { Foo } from '@test/package-g/lib/foo';

export type H = Fa | Foo;

console.log(bareF);
