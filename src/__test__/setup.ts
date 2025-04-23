import deepEqual from 'fast-deep-equal';
import { diff } from 'jest-diff';

import { _resetProjectInfo } from '../module/module.js';
import { _resetSettings } from '../settings/settings.js';
import type { AnalyzedProjectInfo } from '../types/analyzed.js';
import type { BaseESMStatement, BaseProjectInfo } from '../types/base.js';
import { InternalError } from '../util/error.js';
import { _reset } from '../util/files.js';
import type {
  StrippedAnalyzedFileDetails,
  StrippedBaseFileDetails,
  StrippedResolvedFileDetails,
} from './util.js';

function checkProjectObject(projectInfo: unknown) {
  if (typeof projectInfo !== 'object' || projectInfo === null) {
    return {
      message: () => `Expected: an object\nReceived: not an object`,
      pass: false,
    };
  }

  if (!('files' in projectInfo) || !(projectInfo.files instanceof Map)) {
    return {
      message: () =>
        `Expected: an object of files\nReceived: not an object of files`,
      pass: false,
    };
  }

  return undefined;
}

function toMatchSpec<
  FileDetails extends
    | StrippedBaseFileDetails
    | StrippedResolvedFileDetails
    | StrippedAnalyzedFileDetails,
>(baseProjectInfo: unknown, baseSpec: Record<string, FileDetails>) {
  const result = checkProjectObject(baseProjectInfo);
  if (result) {
    return result;
  }

  const files = (baseProjectInfo as BaseProjectInfo).files;

  for (const [filePath, fileDetails] of files.entries()) {
    const expectedFileDetails = baseSpec[filePath];

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!expectedFileDetails) {
      return {
        message: () => `file path ${filePath} is not in the base spec`,
        pass: false,
      };
    }

    if (expectedFileDetails.fileType !== fileDetails.fileType) {
      return {
        message: () => `file path ${filePath} has the wrong file type`,
        pass: false,
      };
    }

    if (
      expectedFileDetails.fileType === 'other' ||
      fileDetails.fileType === 'other'
    ) {
      continue;
    }

    if (
      expectedFileDetails.exports.length !== fileDetails.exports.length ||
      expectedFileDetails.singleImports.length !==
        fileDetails.singleImports.length ||
      expectedFileDetails.barrelImports.length !==
        fileDetails.barrelImports.length ||
      expectedFileDetails.dynamicImports.length !==
        fileDetails.dynamicImports.length ||
      expectedFileDetails.singleReexports.length !==
        fileDetails.singleReexports.length ||
      expectedFileDetails.barrelReexports.length !==
        fileDetails.barrelReexports.length
    ) {
      return {
        message: () =>
          `file path ${filePath} has the wrong number of exports, singleImports, barrelImports, dynamicImports, singleReexports, or barrelReexports`,
        pass: false,
      };
    }

    function compareSet(
      expected: Omit<
        BaseESMStatement,
        'statementNodeRange' | 'reportNodeRange'
      >[],
      actual: BaseESMStatement[]
    ) {
      const actualStripped = actual.map(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({ statementNodeRange, reportNodeRange, ...rest }) => rest
      );
      if (!deepEqual(expected, actualStripped)) {
        const formattedDiff = diff(expected, actualStripped);
        if (!formattedDiff) {
          throw new InternalError('formattedDiff is undefined');
        }
        return formattedDiff;
      }
      return undefined;
    }

    for (const prop of [
      'exports',
      'singleImports',
      'barrelImports',
      'dynamicImports',
      'singleReexports',
      'barrelReexports',
    ] as const) {
      const setDiff = compareSet(expectedFileDetails[prop], fileDetails[prop]);
      if (setDiff) {
        return {
          message: () => `${filePath}:${prop} mismatch:\n${setDiff}`,
          pass: false,
        };
      }
    }
  }

  return {
    message: () => `Expected matches spec`,
    pass: true,
  };
}

// eslint-disable-next-line no-undef
expect.extend({
  toMatchBaseSpec(
    baseProjectInfo: unknown,
    baseSpec: Record<string, StrippedBaseFileDetails>
  ) {
    return toMatchSpec(baseProjectInfo, baseSpec);
  },
  toMatchResolvedSpec(
    resolvedProjectInfo: unknown,
    resolvedSpec: Record<string, StrippedResolvedFileDetails>
  ) {
    return toMatchSpec(resolvedProjectInfo, resolvedSpec);
  },
  toMatchAnalyzedSpec(
    analyzedProjectInfo: unknown,
    analyzedSpec: Record<string, StrippedAnalyzedFileDetails>
  ) {
    const result = checkProjectObject(analyzedProjectInfo);
    if (result) {
      return result;
    }

    // Strip ranges and circular references from importedBy, barrelImportedBy, and rootExportEntry
    for (const [, fileDetails] of (analyzedProjectInfo as AnalyzedProjectInfo)
      .files) {
      if (fileDetails.fileType !== 'code') {
        continue;
      }
      for (const exportEntry of [
        ...fileDetails.exports,
        ...fileDetails.singleReexports,
        ...fileDetails.barrelReexports,
        ...fileDetails.singleImports,
        ...fileDetails.barrelImports,
        ...fileDetails.dynamicImports,
      ]) {
        if ('importedBy' in exportEntry) {
          for (let i = 0; i < exportEntry.importedBy.length; i++) {
            const importEntry = { ...exportEntry.importedBy[i].importEntry };
            exportEntry.importedBy[i].importEntry = importEntry;
            const partialImportEntry = importEntry as Partial<
              typeof importEntry
            >;
            delete partialImportEntry.statementNodeRange;
            delete partialImportEntry.reportNodeRange;
            delete partialImportEntry.rootExportEntry;
          }
        }
        if ('barrelImportedBy' in exportEntry) {
          for (let i = 0; i < exportEntry.barrelImportedBy.length; i++) {
            const importEntry = {
              ...exportEntry.barrelImportedBy[i].importEntry,
            };
            exportEntry.barrelImportedBy[i].importEntry = importEntry;
            const partialImportEntry = importEntry as Partial<
              typeof importEntry
            >;
            delete partialImportEntry.statementNodeRange;
            delete partialImportEntry.reportNodeRange;
          }
        }
        if ('rootExportEntry' in exportEntry && exportEntry.rootExportEntry) {
          const rootExportEntry = {
            ...exportEntry.rootExportEntry,
          };
          exportEntry.rootExportEntry = rootExportEntry;
          const partialRootExportEntry = rootExportEntry as Partial<
            typeof rootExportEntry
          >;
          delete partialRootExportEntry.statementNodeRange;
          delete partialRootExportEntry.reportNodeRange;
          delete partialRootExportEntry.importedBy;
          delete partialRootExportEntry.barrelImportedBy;
        }
      }
    }
    return toMatchSpec(analyzedProjectInfo, analyzedSpec);
  },
});

// eslint-disable-next-line no-undef
beforeEach(() => {
  _resetSettings();
  _resetProjectInfo();
  _reset();
});
