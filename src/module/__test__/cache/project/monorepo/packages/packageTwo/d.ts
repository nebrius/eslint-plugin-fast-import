// @ts-expect-error — cross-package import fixture; @test/package-one is not resolvable via tsconfig
import type { One } from '@test/package-one/a';

const one: One = 'hi';
console.log(one);
