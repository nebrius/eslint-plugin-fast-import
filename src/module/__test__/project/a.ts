/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-extraneous-class */
/* eslint-disable prefer-const */
/* eslint-disable prettier/prettier */

export type Foo = string;

export let a1 = 10, a2 = 10;
export const a3 = 1, a4 = 2;
export var a5 = 1, a6 = 2;

export class A7 { /* … */ }
export function a8() { /* … */ }
export function* a9() {}

export const { a10_1, a10_2: a10_2alias, ...a10_rest } = { a10_1: 10, a10_2: 10, a10_3: 10, a10_4: 10 };
export const [ a11_1, a11_2, ...a11_rest ] = [10, 10, 10, 10];

// Export list
const a12 = 10;
export { a12 as 'a twelve' };

const a13 = 10, a14 = 10;
export { a13, a14 };

const a15 = 10, a16 = 10;
export { a15 as a15alias, a16 as a16alias };

const a17 = 10;
export { a17 as default };