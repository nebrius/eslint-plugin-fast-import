// @ts-expect-error — cross-package import fixture; packageA is not resolvable via tsconfig
import * as a from 'packageA';

console.log(a);
