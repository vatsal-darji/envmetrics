import { access } from 'fs/promises';

export type Environment = 'cgroup-v2' | 'cgroup-v1' | 'os-only';

let cached: Environment | null = null;

export async function detectEnvironment(): Promise<Environment> {
  if (cached !== null) return cached;
  cached = await probe();
  return cached;
}

async function probe(): Promise<Environment> {
  if (await readable('/sys/fs/cgroup/cgroup.controllers')) return 'cgroup-v2';
  if (await readable('/sys/fs/cgroup/memory/memory.limit_in_bytes')) return 'cgroup-v1';
  return 'os-only';
}

async function readable(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function resetDetectorCache(): void {
  cached = null;
}
