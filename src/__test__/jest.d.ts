import type {
  StrippedAnalyzedFileDetails,
  StrippedBaseFileDetails,
  StrippedResolvedFileDetails,
} from './util.ts';

export {};

declare global {
  namespace jest {
    type OwnMatcher<Params extends unknown[]> = (
      this: jest.MatcherContext,
      actual: unknown,
      ...params: Params
    ) => jest.CustomMatcherResult;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Matchers<R, T> {
      toMatchBaseSpec(baseSpec: Record<string, StrippedBaseFileDetails>): T;
      toMatchResolvedSpec(
        resolvedSpec: Record<string, StrippedResolvedFileDetails>
      ): T;
      toMatchAnalyzedSpec(
        analyzedSpec: Record<string, StrippedAnalyzedFileDetails>
      ): T;
    }

    interface ExpectExtendMap {
      toMatchBaseSpec: OwnMatcher<[Record<string, StrippedBaseFileDetails>]>;
      toMatchResolvedSpec: OwnMatcher<
        [Record<string, StrippedResolvedFileDetails>]
      >;
      toMatchAnalyzedSpec: OwnMatcher<
        [Record<string, StrippedAnalyzedFileDetails>]
      >;
    }
  }
}
