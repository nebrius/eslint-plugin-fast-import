export default interface Foo {
  bar: string;
}

export namespace MyNamespace {
  export const d = 10;
}

export import d = MyNamespace.d;
