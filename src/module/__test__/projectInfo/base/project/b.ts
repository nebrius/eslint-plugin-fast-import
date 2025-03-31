import defaultExport1 from './a';
import * as barrel1 from './a';
import { a1 } from './a';
import { a1 as a1Alias } from './a';
import { default as defaultAlias } from './a';
import { 'a twelve' as stringAlias } from './a';
import defaultExport2, { a1 as a1WithDefault } from './a';
import defaultExport3, * as barrel2 from './a';
import './a';

console.log(defaultExport1, defaultExport2, defaultExport3);
console.log(a1, a1Alias, a1WithDefault);
console.log(barrel1, barrel2);
console.log(defaultAlias, stringAlias);

void import('./a.js');

function foo() {}
export default foo;
