export default interface Foo {
  bar: string;
}

export namespace MyNamespace {
  // This form of import is only supported in namespaces, and not supported by
  // Fast Import. It will cause an "unsupported node" error, so makes a 
  // @ts-expect-error
  export import eslint = require('eslint');
}
