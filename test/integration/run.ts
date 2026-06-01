import { collect } from '../../src/index.js';

const EXPECTED_MEMORY_BYTES = 256 * 1024 * 1024; // 256MB
const EXPECTED_CPU_CORES = 0.5;
const TOLERANCE = 0.01; // 1%

function assertClose(actual: number, expected: number, label: string): void {
  const diff = Math.abs(actual - expected) / expected;
  if (diff > TOLERANCE) {
    throw new Error(`${label}: expected ~${expected}, got ${actual} (${(diff * 100).toFixed(2)}% off)`);
  }
  console.log(`  ✓ ${label}: ${actual} (expected ~${expected})`);
}

function assertBetween(actual: number, min: number, max: number, label: string): void {
  if (actual < min || actual > max) {
    throw new Error(`${label}: expected between ${min} and ${max}, got ${actual}`);
  }
  console.log(`  ✓ ${label}: ${actual}`);
}

async function run(): Promise<void> {
  console.log('Running envmetrics integration test...\n');

  const snapshot = await collect();

  console.log('Snapshot:');
  console.log(JSON.stringify(snapshot, null, 2));
  console.log('\nAssertions:');

  // confidence must reflect cgroup, not os-only
  if (snapshot.confidence === 'os-only' || snapshot.confidence === 'unknown') {
    throw new Error(
      `confidence is "${snapshot.confidence}" — cgroup files were not detected. ` +
      `Are you running inside a container with limits set?`
    );
  }
  console.log(`  ✓ confidence: "${snapshot.confidence}"`);

  // memory limit must match the --memory=256m flag
  assertClose(snapshot.memory.limitBytes, EXPECTED_MEMORY_BYTES, 'memory.limitBytes');

  // cpu quota must match the --cpus=0.5 flag
  if (snapshot.cpu.quotaCores === null) {
    throw new Error('cpu.quotaCores is null — CPU limit was not detected');
  }
  assertClose(snapshot.cpu.quotaCores, EXPECTED_CPU_CORES, 'cpu.quotaCores');

  // fractions must be in valid range
  assertBetween(snapshot.memory.usedFraction, 0, 1, 'memory.usedFraction');

  if (snapshot.cpu.usedFraction !== null) {
    assertBetween(snapshot.cpu.usedFraction, 0, 10, 'cpu.usedFraction');
  }

  if (snapshot.eventLoop.lagMs < 0) {
    throw new Error(`eventLoop.lagMs is negative: ${snapshot.eventLoop.lagMs}`);
  }
  console.log(`  ✓ eventLoop.lagMs: ${snapshot.eventLoop.lagMs}`);

  console.log('\nAll assertions passed.');
}

run().catch((err: unknown) => {
  console.error('\nIntegration test FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
