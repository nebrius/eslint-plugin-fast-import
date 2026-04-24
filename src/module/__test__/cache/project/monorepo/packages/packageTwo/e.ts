// @ts-expect-error — cross-package import fixture; @test/package-one is not resolvable via tsconfig
import * as pkg from '@test/package-one/a';

console.log(pkg);
