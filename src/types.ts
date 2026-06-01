export type ConfidenceLevel =
  | 'cgroup-v2'
  | 'cgroup-v1'
  | 'os-only'
  | 'unknown';

export interface MemoryMetrics {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  limitBytes: number;
  usedFraction: number;
}

export interface CpuMetrics {
  usagePercent: number;
  quotaCores: number | null;
  usedFraction: number | null;
}

export interface EventLoopMetrics {
  lagMs: number;
}

export interface Snapshot {
  timestamp: number;
  confidence: ConfidenceLevel;
  memory: MemoryMetrics;
  cpu: CpuMetrics;
  eventLoop: EventLoopMetrics;
}

export interface ResolvedLimits {
  memoryLimitBytes: number;
  cpuQuotaCores: number | null;
}
