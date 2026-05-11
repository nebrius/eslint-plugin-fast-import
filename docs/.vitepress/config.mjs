import { defineConfig } from 'vitepress';

const ROOT_README_URL =
  'https://github.com/nebrius/import-integrity-lint/blob/main/README.md';

function rewriteIncludedReadmeLinks(md) {
  const defaultLinkOpenRenderer =
    md.renderer.rules.link_open ??
    ((tokens, idx, options, env, self) =>
      self.renderToken(tokens, idx, options));

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const hrefIndex = token.attrIndex('href');

    if (hrefIndex >= 0 && token.attrs) {
      const href = token.attrs[hrefIndex][1];
      const ruleReadmeMatch = href.match(
        /^\.\.\/([^/]+)\/README\.md(#[^\s)]*)?$/
      );
      const rootReadmeMatch = href.match(
        /^\.\.\/\.\.\/\.\.\/README\.md(#[^\s)]*)?$/
      );

      if (ruleReadmeMatch) {
        token.attrs[hrefIndex][1] =
          `/rules/${ruleReadmeMatch[1]}/${ruleReadmeMatch[2] ?? ''}`;
      } else if (rootReadmeMatch) {
        token.attrs[hrefIndex][1] =
          `${ROOT_README_URL}${rootReadmeMatch[1] ?? ''}`;
      }
    }

    return defaultLinkOpenRenderer(tokens, idx, options, env, self);
  };
}

export default defineConfig({
  title: 'Import Integrity',
  description:
    'ESLint/Oxlint plugin with rules to ensure proper semantic usage of imports and exports',
  base: '/eslint-plugin-fast-import/',
  outDir: '../dist-docs',
  markdown: {
    config: rewriteIncludedReadmeLinks,
  },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Configuration', link: '/configuration/' },
      { text: 'Rules', link: '/rules/' },
    ],
    search: {
      provider: 'local',
    },
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Overview', link: '/guide/' },
            { text: 'Quickstart', link: '/guide/quickstart' },
            { text: 'Comparisons', link: '/guide/comparisons' },
            { text: 'How it works', link: '/guide/how-it-works' },
            { text: 'Creating rules', link: '/guide/creating-rules' },
            { text: 'FAQ', link: '/guide/faq' },
          ],
        },
      ],
      '/configuration/': [
        {
          text: 'Configuration',
          items: [
            { text: 'Overview', link: '/configuration/' },
            {
              text: 'Repo-level options',
              link: '/configuration/repo-level-options',
            },
            {
              text: 'Package-level options',
              link: '/configuration/package-level-options',
            },
            { text: 'Monorepos', link: '/configuration/monorepos' },
          ],
        },
      ],
      '/rules/': [
        {
          text: 'Rules',
          items: [{ text: 'Overview', link: '/rules/' }],
        },
        {
          text: 'Correctness',
          items: [
            { text: 'no-cycle', link: '/rules/no-cycle/' },
            { text: 'no-unused-exports', link: '/rules/no-unused-exports/' },
            {
              text: 'no-unused-package-exports',
              link: '/rules/no-unused-package-exports/',
            },
            {
              text: 'no-unresolved-imports',
              link: '/rules/no-unresolved-imports/',
            },
          ],
        },
        {
          text: 'Boundaries',
          items: [
            {
              text: 'no-test-only-imports',
              link: '/rules/no-test-only-imports/',
            },
            {
              text: 'no-test-imports-in-prod',
              link: '/rules/no-test-imports-in-prod/',
            },
            {
              text: 'no-restricted-imports',
              link: '/rules/no-restricted-imports/',
            },
            { text: 'no-node-builtins', link: '/rules/no-node-builtins/' },
          ],
        },
        {
          text: 'Aesthetics',
          items: [
            {
              text: 'prefer-alias-imports',
              link: '/rules/prefer-alias-imports/',
            },
            {
              text: 'require-node-prefix',
              link: '/rules/require-node-prefix/',
            },
          ],
        },
        {
          text: 'Footguns',
          items: [
            {
              text: 'no-empty-entry-points',
              link: '/rules/no-empty-entry-points/',
            },
            {
              text: 'no-entry-point-imports',
              link: '/rules/no-entry-point-imports/',
            },
            {
              text: 'no-external-barrel-reexports',
              link: '/rules/no-external-barrel-reexports/',
            },
            {
              text: 'no-named-as-default',
              link: '/rules/no-named-as-default/',
            },
            {
              text: 'no-unnamed-entry-point-exports',
              link: '/rules/no-unnamed-entry-point-exports/',
            },
          ],
        },
      ],
    },
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/nebrius/import-integrity-lint',
      },
    ],
  },
});
