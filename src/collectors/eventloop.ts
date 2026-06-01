import { monitorEventLoopDelay } from "perf_hooks";
import type { EventLoopMetrics } from "../types.js";

const histogram = monitorEventLoopDelay({resolution: 10})
histogram.enable()

export function collectEventLoop():EventLoopMetrics{
    const histogramMean = histogram.mean
    const lagMs = histogramMean/1000000
    histogram.reset()
    return {lagMs}
} 