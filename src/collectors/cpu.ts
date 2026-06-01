import type { CpuMetrics } from "../types.js";

interface CpuSample {
  user: number;
  system: number;
  wallMs: number;
}

let prev: CpuSample | null = null;

export async function collectCpu(quotaCores: number | null): Promise<CpuMetrics> {
    if (prev === null) {
        prev = takeSample();
        await sleep(100);
    }
    const cur = takeSample();  // this is always now
    
    const deltaUser = cur.user - prev.user
    const deltaSystem = cur.system - prev.system
    const deltaWallMs = cur.wallMs - prev.wallMs

    let fractionOfOneCore = (deltaUser + deltaSystem) / 1000 / deltaWallMs;

    if (deltaWallMs === 0) {
      prev = cur;
      return {
        usagePercent: 0,
        quotaCores,
        usedFraction: quotaCores !== null ? 0 : null,
      };
    }
    

    return {
      usagePercent: fractionOfOneCore * 100,
      quotaCores,
      usedFraction: quotaCores !== null ? fractionOfOneCore / quotaCores : null,
    };
}

function takeSample(): CpuSample {
  
    const { user, system } = process.cpuUsage();
    const wallMs = Date.now();

  return{user, system, wallMs}
}

async function sleep(ms: number): Promise<void>{
    return new Promise(resolve => setTimeout(resolve, ms))
}