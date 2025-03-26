export function warn(msg: string) {
  console.warn(`[Warn] fast-esm: ${msg}`);
}

export function error(msg: string) {
  console.error(`[Error] fast-esm: ${msg}`);
}

let verboseEnabled = false;
export function setVerbose(verbose: boolean) {
  verboseEnabled = verbose;
}

export function debug(msg: string) {
  if (verboseEnabled) {
    console.debug(`[Debug] fast-esm: ${msg}`);
  }
}

export function formatMilliseconds(duration: number) {
  return duration.toLocaleString() + 'ms';
}
