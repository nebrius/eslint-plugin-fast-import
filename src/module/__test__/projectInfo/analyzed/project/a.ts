import { c1 } from './b';
import * as b from './b';
import { d1, f } from './e';
import { join } from './f';
import { SourceCode } from './g';

// entry point reexport
export type { SourceCode as ASourceCode } from './f';

console.log(c1);
console.log(b);
console.log(d1);
console.log(f);
console.log(join);
console.log(SourceCode);
