import { c1 } from './b';
import * as b from './b';
import { d1, f } from './e';
import { join } from './f';
// @ts-expect-error
import { SourceCode } from './g?raw';
import h from './h.json'

// entry point reexport
export type { SourceCode as ASourceCode } from './f';
