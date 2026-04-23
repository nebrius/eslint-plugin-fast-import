import { splitPathIntoSegments } from './files.js';

export function getSubpathEntry<T>({
  filePath,
  data,
}: {
  filePath: string;
  data: Map<string, T>;
}) {
  const filePathSegments = splitPathIntoSegments(filePath);
  let longestCommonPath: { path: string; value: T } | undefined;
  for (const [path, value] of data) {
    const splitPath = splitPathIntoSegments(path);
    let isMatch = true;
    for (let i = 0; i < splitPath.length; i++) {
      if (filePathSegments[i] !== splitPath[i]) {
        isMatch = false;
        break;
      }
    }
    if (
      isMatch &&
      (!longestCommonPath ||
        splitPath.length > splitPathIntoSegments(longestCommonPath.path).length)
    ) {
      longestCommonPath = { path, value };
    }
  }
  return longestCommonPath ? longestCommonPath.value : undefined;
}
