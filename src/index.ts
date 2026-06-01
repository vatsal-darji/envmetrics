import { detectEnvironment } from './detector.js';
import { resolveLimits } from './limits/index.js';
import { collectMemory } from './collectors/memory.js';
import { collectCpu } from './collectors/cpu.js';
import { collectEventLoop } from './collectors/eventloop.js';
import type { Snapshot } from './types.js';

export async function collect(): Promise<Snapshot> {
  const env = await detectEnvironment();
  const limits = await resolveLimits(env);

  const [cpu, memory] = await Promise.all([
    collectCpu(limits.cpuQuotaCores),
    Promise.resolve(collectMemory(limits.memoryLimitBytes)),
  ]);

  return {
    timestamp: Date.now(),
    confidence: env,
    memory,
    cpu,
    eventLoop: collectEventLoop(),
  };
}

export type { Snapshot, MemoryMetrics, CpuMetrics, EventLoopMetrics, ConfidenceLevel } from './types.js';
