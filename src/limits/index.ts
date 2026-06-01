import type { ResolvedLimits } from '../types.js'
import type { Environment } from '../detector.js';
import { resolveCgroupV2 } from './cgroup-v2.js';
import { resolveCgroupV1 } from './cgroup-v1.js';
import { resolveOsFallback } from './os-fallback.js';

export async function resolveLimits(env: Environment):  Promise<ResolvedLimits>{
    if(env === "cgroup-v1"){
        return resolveCgroupV1()
    }else if (env === "cgroup-v2"){
        return resolveCgroupV2()
    }else {
        return resolveOsFallback();
    }
}