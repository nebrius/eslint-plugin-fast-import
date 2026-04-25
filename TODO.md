New rules:
- Add new lint rule that forbids non-named barrel reexports in entry point files
- Create lint rule prohibiting entry point/externally imported files from having no exports
- no-unresolved-package-imports rule?

Config:
- Automatically infer entry point files from a combination of package.json and tsconfig.json (the latter creates the mapping for the former)

Misc:
- Rename plugin
- Proper docs site on GitHub Pages
- Upgrade to vitest
