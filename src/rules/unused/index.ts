import { createRule, getESMInfo } from '../util';

export const noUnusedExports = createRule({
  name: 'no-unused-exports',
  meta: {
    docs: {
      description: 'Ensures that all exports are imported in another file',
    },
    schema: [],
    fixable: undefined,
    type: 'problem',
    messages: {
      noUnusedExports: 'Exports must be imported in a file somewhere',
      noTestOnlyImports: 'Exports must be imported by non-test code',
    },
  },
  defaultOptions: [],
  create(context, options) {
    const esmInfo = getESMInfo(context.filename);
    return {};
  },
});
