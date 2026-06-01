import { readFile } from "node:fs/promises";
import type { ResolvedLimits } from "../types.js";
import os from "os";

export async function resolveCgroupV2(): Promise<ResolvedLimits> {
  const [memoryLimitBytes, cpuQuotaCores] = await Promise.all([
    readFile("/sys/fs/cgroup/memory.max", "utf8")
      .then((raw) => parseMemoryMax(raw))
      .catch(() => os.totalmem()),
    readFile("/sys/fs/cgroup/cpu.max", "utf8")
      .then((raw) => parseCpuMax(raw))
      .catch(() => null),
  ]);

  return { memoryLimitBytes, cpuQuotaCores };
}

export function parseMemoryMax(raw: string): number {
  const value = raw.trim();
  if (value === "max") return os.totalmem();
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? os.totalmem() : parsed;
}

export function parseCpuMax(raw: string): number | null {
  const [quota, period] = raw.trim().split(/\s+/);
  if (quota === undefined || period === undefined) return null;
  if (quota === "max") return null;
  const q = Number.parseInt(quota, 10);
  const p = Number.parseInt(period, 10);
  if (Number.isNaN(q) || Number.isNaN(p)) return null;
  return q / p;
}
