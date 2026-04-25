// @ts-expect-error — cross-package import fixture; @test/package-a is not resolvable via tsconfig
import * as a from '@test/package-a';

console.log(a);
