import { readFile } from "node:fs/promises";
import type { ResolvedLimits } from "../types.js";
import os from "os";

export async function resolveCgroupV1(): Promise<ResolvedLimits> {
  const [memoryLimitBytes, cpuQuotaCores] = await Promise.all([
    readFile("/sys/fs/cgroup/memory/memory.limit_in_bytes", "utf8")
      .then((raw) => parseMemoryLimitV1(raw))
      .catch(() => os.totalmem()),
    Promise.all([
      readFile("/sys/fs/cgroup/cpu/cpu.cfs_quota_us", "utf8"),
      readFile("/sys/fs/cgroup/cpu/cpu.cfs_period_us", "utf8"),
    ])
      .then(([quotaRaw, periodRaw]) => parseCpuQuotaV1(quotaRaw, periodRaw))
      .catch(() => null),
  ]);

  return { memoryLimitBytes, cpuQuotaCores };
}

export function parseMemoryLimitV1(raw: string): number {
  const parsed = Number.parseInt(raw.trim(), 10);
  if (Number.isNaN(parsed)) return os.totalmem();
  if (parsed > os.totalmem() * 10) return os.totalmem();
  return parsed;
}

export function parseCpuQuotaV1(quotaRaw: string, periodRaw: string): number | null {
  const quota = Number.parseInt(quotaRaw.trim(), 10);
  const period = Number.parseInt(periodRaw.trim(), 10);
  if (Number.isNaN(quota) || Number.isNaN(period)) return null;
  if (quota === -1) return null;
  return quota / period;
}
