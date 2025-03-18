import { join } from 'path';
import { computeBaseInfo } from '../../computeBaseInfo';
import { stripNodes } from '../util';

const TEST_PROJECT_DIR = join(__dirname, 'project');
const FILE_A = join(TEST_PROJECT_DIR, 'a.ts');
const FILE_B = join(TEST_PROJECT_DIR, 'b.ts');
const FILE_C = join(TEST_PROJECT_DIR, 'c.ts');
const FILE_D = join(TEST_PROJECT_DIR, 'd.ts');
const FILE_E = join(TEST_PROJECT_DIR, 'e.json');

it('Computes base info', () => {
  const info = computeBaseInfo({
    sourceRoot: TEST_PROJECT_DIR,
    rootImportAlias: '@',
    allowAliaslessRootImports: false,
    isEntryPointCheck: () => false,
  });
  expect(stripNodes(info)).toEqual({
    allowAliaslessRootImports: false,
    files: {
      [FILE_A]: {
        exports: [
          {
            exportName: 'Foo',
            isEntryPoint: false,
          },
          {
            exportName: 'Bar',
            isEntryPoint: false,
          },
          {
            exportName: 'a1',
            isEntryPoint: false,
          },
          {
            exportName: 'a2',
            isEntryPoint: false,
          },
          {
            exportName: 'a3',
            isEntryPoint: false,
          },
          {
            exportName: 'a4',
            isEntryPoint: false,
          },
          {
            exportName: 'a5',
            isEntryPoint: false,
          },
          {
            exportName: 'a6',
            isEntryPoint: false,
          },
          {
            exportName: 'A7',
            isEntryPoint: false,
          },
          {
            exportName: 'a8',
            isEntryPoint: false,
          },
          {
            exportName: 'a9',
            isEntryPoint: false,
          },
          {
            exportName: 'a10_1',
            isEntryPoint: false,
          },
          {
            exportName: 'a10_2alias',
            isEntryPoint: false,
          },
          {
            exportName: 'a10_rest',
            isEntryPoint: false,
          },
          {
            exportName: 'a11_1',
            isEntryPoint: false,
          },
          {
            exportName: 'a11_2',
            isEntryPoint: false,
          },
          {
            exportName: 'a11_rest',
            isEntryPoint: false,
          },
          {
            exportName: 'a twelve',
            isEntryPoint: false,
          },
          {
            exportName: 'a13',
            isEntryPoint: false,
          },
          {
            exportName: 'a14',
            isEntryPoint: false,
          },
          {
            exportName: 'a15alias',
            isEntryPoint: false,
          },
          {
            exportName: 'a16alias',
            isEntryPoint: false,
          },
          {
            exportName: 'default',
            isEntryPoint: false,
          },
          {
            exportName: 'a18_1',
            isEntryPoint: false,
          },
          {
            exportName: 'a18_2',
            isEntryPoint: false,
          },
          {
            exportName: 'a18_3',
            isEntryPoint: false,
          },
        ],
        fileType: 'code',
        imports: [],
        reexports: [],
      },
      [FILE_B]: {
        exports: [
          {
            exportName: 'default',
            isEntryPoint: false,
          },
        ],
        fileType: 'code',
        imports: [
          {
            importAlias: 'defaultExport1',
            importName: 'default',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            importType: 'barrel',
            moduleSpecifier: './a',
          },
          {
            importAlias: 'a1',
            importName: 'a1',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            importAlias: 'a1Alias',
            importName: 'a1',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            importAlias: 'defaultAlias',
            importName: 'default',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            importAlias: 'stringAlias',
            importName: 'a twelve',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            importAlias: 'defaultExport2',
            importName: 'default',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            importAlias: 'a1WithDefault',
            importName: 'a1',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            importAlias: 'defaultExport3',
            importName: 'default',
            importType: 'single',
            isTypeImport: false,
            moduleSpecifier: './a',
          },
          {
            importType: 'barrel',
            moduleSpecifier: './a',
          },
          {
            importType: 'dynamic',
            moduleSpecifier: './a.js',
          },
        ],
        reexports: [],
      },
      [FILE_C]: {
        exports: [
          {
            exportName: 'default',
            isEntryPoint: false,
          },
        ],
        fileType: 'code',
        imports: [],
        reexports: [
          {
            exportName: 'a1',
            importName: 'a1',
            isTypeReexport: false,
            moduleSpecifier: './a',
            reexportType: 'single',
            isEntryPoint: false,
          },
          {
            exportName: undefined,
            isTypeReexport: false,
            moduleSpecifier: './a',
            reexportType: 'barrel',
          },
          {
            exportName: 'c',
            isTypeReexport: false,
            moduleSpecifier: './a',
            reexportType: 'barrel',
          },
          {
            exportName: 'c1',
            importName: 'default',
            isTypeReexport: false,
            moduleSpecifier: './a',
            reexportType: 'single',
            isEntryPoint: false,
          },
          {
            exportName: 'c2',
            importName: 'a1',
            isTypeReexport: false,
            moduleSpecifier: './a',
            reexportType: 'single',
            isEntryPoint: false,
          },
          {
            exportName: 'Foo',
            importName: 'Foo',
            isTypeReexport: true,
            moduleSpecifier: './a',
            reexportType: 'single',
            isEntryPoint: false,
          },
        ],
      },
      [FILE_D]: {
        exports: [
          {
            exportName: 'default',
            isEntryPoint: false,
          },
        ],
        fileType: 'code',
        imports: [],
        reexports: [],
      },
      [FILE_E]: {
        fileType: 'other',
      },
    },
    rootImportAlias: '@',
    sourceRoot: TEST_PROJECT_DIR,
  });
});
