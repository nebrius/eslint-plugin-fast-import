export function warn(msg: string) {
  console.warn(`[Warn] fast-import: ${msg}`);
}

let verboseEnabled = false;
export function setVerbose(verbose: boolean) {
  verboseEnabled = verbose;
}

export function debug(msg: string) {
  if (verboseEnabled) {
    console.debug(`[Debug] fast-import: ${msg}`);
  }
}

export function formatMilliseconds(duration: number) {
  const roundedDuration = Math.round(duration * 10) / 10;
  return `${roundedDuration.toLocaleString()}ms`;
}
