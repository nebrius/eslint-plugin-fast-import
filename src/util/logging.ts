export function warn(msg: string) {
  console.warn(`[Warn] fast-import: ${msg}`);
}

export function error(msg: string) {
  console.error(`[Error] fast-import: ${msg}`);
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
  return duration.toLocaleString() + 'ms';
}
