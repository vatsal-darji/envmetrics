# envmetrics

A lightweight, cgroup-aware Node.js library that returns current resource usage as a fraction of actual usable limits — correctly, across environments.

Works on bare metal, inside Docker containers, and on Kubernetes. No runtime dependencies.

---

## The Problem It Solves

When your Node.js process runs inside a container, the OS-level APIs lie to you.

```
os.totalmem()  → 16GB   (the host machine's RAM)
os.cpus()      → 8      (the host machine's cores)
```

But your container might only have `--memory=256m` and `--cpus=0.5`. If you make scaling or throttling decisions based on the host numbers, you're working with completely wrong data.

`envmetrics` reads the real limits from Linux cgroup files — the same source Docker and Kubernetes use to enforce those limits — and returns usage as a fraction of what your process is actually allowed to use.

---

## Installation

```bash
npm install envmetrics
```

**Requirements:** Node.js >= 18. Zero runtime dependencies.

---

## Quick Start

```typescript
import { collect } from 'envmetrics';

const snapshot = await collect();
console.log(snapshot);
```

**Example output (inside a container with `--memory=256m --cpus=0.5`):**

```json
{
  "timestamp": 1748823456789,
  "confidence": "cgroup-v2",
  "memory": {
    "rss": 87306240,
    "heapUsed": 7699504,
    "heapTotal": 9560064,
    "external": 2617052,
    "limitBytes": 268435456,
    "usedFraction": 0.325
  },
  "cpu": {
    "usagePercent": 0.75,
    "quotaCores": 0.5,
    "usedFraction": 0.015
  },
  "eventLoop": {
    "lagMs": 12.6
  }
}
```

---

## Understanding the Output

### `timestamp`

Unix timestamp in milliseconds (`Date.now()`) of when the snapshot was taken.

---

### `confidence`

How the resource limits were determined. This is the most important field — it tells you how much to trust the limit numbers.

| Value | Meaning | Trust level |
|-------|---------|-------------|
| `"cgroup-v2"` | Limits read from `/sys/fs/cgroup/` (modern Linux, Docker, Kubernetes) | High |
| `"cgroup-v1"` | Limits read from `/sys/fs/cgroup/memory/` and `/sys/fs/cgroup/cpu/` (older Linux, some AWS instances) | High |
| `"os-only"` | Fell back to `os.totalmem()` — no cgroup files found (macOS, Windows, bare metal without cgroups) | Low |
| `"unknown"` | Could not determine anything | None |

If `confidence` is `"os-only"`, the memory limit reflects the host machine's total RAM, not a container limit. CPU quota will be `null`. This is still useful on bare metal — it just means there are no container-enforced limits to report.

---

### `memory`

| Field | Type | Description |
|-------|------|-------------|
| `rss` | `number` (bytes) | Resident Set Size — total memory the OS has allocated to this process, including heap, stack, and C++ objects |
| `heapUsed` | `number` (bytes) | V8 JavaScript heap currently in use |
| `heapTotal` | `number` (bytes) | Total V8 heap allocated (used + reserved) |
| `external` | `number` (bytes) | Memory used by C++ objects bound to JavaScript (Buffers, native addons) |
| `limitBytes` | `number` (bytes) | The actual memory ceiling — from cgroup if available, otherwise `os.totalmem()` |
| `usedFraction` | `number` [0, 1] | `rss / limitBytes` — how much of the limit is in use. Clamped to 1.0 |

**How to read `usedFraction`:**
- `0.0` → process is using almost no memory
- `0.5` → using half of the allowed limit
- `0.9` → approaching the limit — potential OOM risk
- `1.0` → at or over the limit (clamped) — container may be OOM killed soon

**Example:** `usedFraction: 0.325` means the process is using 32.5% of its 256MB limit (~83MB in use).

---

### `cpu`

| Field | Type | Description |
|-------|------|-------------|
| `usagePercent` | `number` | Percentage of one CPU core used since the last sample. Can exceed 100 on multi-threaded workloads |
| `quotaCores` | `number \| null` | The cgroup CPU quota in cores (e.g. `0.5` means half a core). `null` if no quota is set |
| `usedFraction` | `number \| null` | `(usagePercent / 100) / quotaCores` — fraction of the CPU quota used. `null` if `quotaCores` is `null` |

**How to read `usagePercent`:**

This measures CPU time burned relative to one core, sampled over the interval since the last `collect()` call. It is **not** a percentage of the total host CPU.

- `0` → process used no CPU
- `50` → used 50% of one core
- `100` → used one full core
- `200` → used two full cores (possible with worker threads)

**How to read `usedFraction`:**
- `0.0` → using no CPU quota
- `0.5` → using half of the allowed quota
- `1.0` → using the full quota (throttling may occur)
- `> 1.0` → burst above quota (brief spikes are normal; sustained values above 1.0 mean the process is being throttled)

**Example:** `quotaCores: 0.5, usedFraction: 0.015` means the container has half a core of quota and the process is using 1.5% of it — essentially idle.

**Note on the first call:** The first `collect()` takes approximately 100ms because CPU usage is a rate, not a point measurement. It needs two samples with a time gap to calculate the rate. Every subsequent call returns instantly using the cached previous sample.

**Note when `quotaCores` is `null`:** No CPU quota is enforced. `usedFraction` will also be `null`. This is correct — there is no ceiling to divide by.

---

### `eventLoop`

| Field | Type | Description |
|-------|------|-------------|
| `lagMs` | `number` (milliseconds) | Mean delay beyond the expected tick interval, measured by a background libuv timer |

The event loop processes one task at a time. `lagMs` measures how long tasks are waiting in the queue before they get picked up. High lag means the event loop is blocked — typically by synchronous CPU work, large JSON parsing, or saturated I/O.

**How to read `lagMs`:**
- `0–2ms` → healthy, event loop is free
- `10–50ms` → moderate load
- `50–200ms` → heavy load, consider offloading work to worker threads
- `> 200ms` → event loop is severely blocked — user-visible latency impact

**Implementation note:** This uses `perf_hooks.monitorEventLoopDelay()` which runs in a separate libuv thread. It does not block the event loop to measure itself. Each call to `collect()` reads the mean lag since the last call and resets the window.

---

## Continuous Monitoring

For production use, poll at a regular interval:

```typescript
import { collect } from 'envmetrics';
import type { Snapshot } from 'envmetrics';

async function monitor(intervalMs = 5000): Promise<void> {
  while (true) {
    const snapshot: Snapshot = await collect();

    if (snapshot.memory.usedFraction > 0.85) {
      console.warn(`Memory pressure: ${(snapshot.memory.usedFraction * 100).toFixed(1)}% of limit used`);
    }

    if (snapshot.cpu.usedFraction !== null && snapshot.cpu.usedFraction > 0.9) {
      console.warn(`CPU throttle risk: ${(snapshot.cpu.usedFraction * 100).toFixed(1)}% of quota used`);
    }

    if (snapshot.eventLoop.lagMs > 100) {
      console.warn(`Event loop lag: ${snapshot.eventLoop.lagMs.toFixed(1)}ms`);
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

monitor();
```

---

## Environment Detection

The library detects which limit source to use at startup and caches the result:

```
1. /sys/fs/cgroup/cgroup.controllers readable?     → cgroup-v2
2. /sys/fs/cgroup/memory/memory.limit_in_bytes readable? → cgroup-v1
3. Otherwise                                        → os-only
```

On macOS and Windows, cgroup files do not exist. The detector falls through to `os-only`. The library still works — it just reports host-level limits rather than container limits. `confidence` reflects this so you know what you're getting.

---

## Running Tests

### Unit tests

Tests the parsing logic and collectors with fixture inputs. Runs on any machine, no Docker needed.

```bash
npm test
```

24 tests covering:
- cgroup v2 file parsing (normal values, `"max"` sentinel, garbage input)
- cgroup v1 file parsing (`-1` quota, large unlimited sentinel, garbage input)
- Environment detector (valid output, caching behaviour, macOS fallback)
- Memory collector (fraction math, clamping when RSS exceeds limit)
- CPU collector (shape, rate formula, cache behaviour)

### Integration test

Runs inside a real Docker container with `--memory=256m --cpus=0.5` and validates that the library reads the correct limits from cgroup files end-to-end.

```bash
npm run test:integration
```

Requires Docker to be running. Takes 30–60 seconds (installs npm packages inside the container on each run).

**What the integration test asserts:**

| Assertion | What it checks |
|-----------|---------------|
| `confidence !== "os-only"` | cgroup files were found and read — library didn't fall through to the OS fallback |
| `memory.limitBytes ≈ 268435456` | The value read from `/sys/fs/cgroup/memory.max` matches `256 × 1024 × 1024` exactly |
| `cpu.quotaCores ≈ 0.5` | The value computed from `cpu.max` matches `--cpus=0.5` exactly |
| `memory.usedFraction` in [0, 1] | Fraction is a valid, realistic number |
| `cpu.usedFraction` in [0, 10] | Fraction is non-negative (brief burst spikes above 1 are real and allowed) |
| `eventLoop.lagMs >= 0` | Lag is non-negative |

---

## TypeScript Support

All types are exported. No `@types` package needed.

```typescript
import type {
  Snapshot,
  MemoryMetrics,
  CpuMetrics,
  EventLoopMetrics,
  ConfidenceLevel,
} from 'envmetrics';
```
