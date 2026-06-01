import os from 'os';
import type { ResolvedLimits } from '../types.js';

export function resolveOsFallback(): ResolvedLimits {
  return {
    memoryLimitBytes: os.totalmem(),
    cpuQuotaCores: null, // null because it is a fallback and if it cannot surely tell the quota of the cores, so better be safe than sorry so cant write os.cpus().length here because we dont know for sure who much is allowed here for docker or any container.
  };
}
