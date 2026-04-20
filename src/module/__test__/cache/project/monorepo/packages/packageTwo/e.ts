// @ts-expect-error — cross-package import fixture; packageOne is not resolvable via tsconfig
import * as pkg from 'packageOne';

console.log(pkg);
