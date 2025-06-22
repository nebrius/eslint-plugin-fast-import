# fast-import/restricted

Restricts which files can import which modules.

## Rule Details

This rule can be used to restrict which files can import which modules. This can be useful for enforcing code organization when you want to restrict imports to certain parts of a codebase.

For example, let's say you're building a library with a virtualized file system. In this case, you'll want to restrict most of the codebase from importing `node:fs` in all files _except_ for the file that implements the virtualized file system.

Similarly, let's say you're building a Next.js application. In this case, you'll likely have a handful of components that are usable on any page. You'll also have some components that can only be used on a specific page (e.g. due to assumptions that certain global state unique to that page are available). In this case, you'll want to restrict the page specific components from being imported in any other page.

## Options

### rules

The `rules` option is an array of objects that define the rules for restricting imports. Each rule has the following properties:

- `type`: The type of module we're restricting. Must be one of `first-party` or `third-party`.
- `filepath`: (first-party) The filepath to restrict. Can be a string or a regular expression.
- `moduleSpecifier`: (third-party) The module specifier to restrict. Can be a string or a regular expression.
- `allowed`: An array of filepaths that are allowed to import the restricted filepath. Can be strings or regular expressions.
- `denied`: An array of filepaths that are denied from importing the restricted filepath. Can be strings or regular expressions.
- `message`: An optional custom message to display when a restricted import is found.
  - Supplying a custom message is strongly recommended, because you can communicate to your users _why_ this import is restricted, e.g. `this component can only be used on the settings page`.

For properties that take filepaths, be aware of how filepath matching works. If a string is specified and is a relative path, it is assumed to be relative to the plugin's `rootDir` setting. If a regular expression is specified, be aware that files testing using this regular expression are _always_ absolute. This means that you cannot do something like `allowed: [/^\.a.ts$/]`, since no file passed in will ever start with `./`.

Examples of _incorrect_ code

Given the configuration:

```json
{
  "rules": [
    {
      "type": "first-party",
      "filepath": "./a.ts",
      "allowed": ["./b.ts", "./c.ts"],
      "denied": ["./d.ts", "./e.ts"],
      "message": "This file can only be imported by ./b.ts and ./c.ts"
    }
  ]
}
```

The following code is incorrect:

```ts
// a.ts
import { a } from './a.ts';

// d.ts
import { a } from './a.ts';

// e.ts
import { a } from './a.ts';

// f.ts
import { a } from './a.ts';
```

The following code is correct:

```ts
// b.ts
import { a } from './a.ts';

// c.ts
import { a } from './a.ts';
```
