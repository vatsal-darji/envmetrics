import type { MemoryMetrics } from "../types.js";

export function collectMemory(limitBytes: number): MemoryMetrics {
    const { rss, heapTotal, heapUsed, external } = process.memoryUsage();
    const usedFraction = Math.min(1, rss/limitBytes)
    return { rss, heapUsed, heapTotal, external, limitBytes, usedFraction };
}