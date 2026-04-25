New rules:
- Add new lint rule that forbids non-named barrel reexports in entry point files
- Split test part of no unused into `no-test-only-exports`
- Create lint rule prohibiting entry point/externally imported files from having no exports
- no-unresolved-package-imports rule?

Config:
- Allow config files in single repo mode (useful for mixed package-level single-repo and repo-level monorepo configs)
- Automatically infer entry point files from a combination of package.json and tsconfig.json (the latter creates the mapping for the former)

Misc:
- Enable type-checking on tests
- Rename plugin