import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectCpu } from '../../src/collectors/cpu.js';

test('cpu: returns valid CpuMetrics shape', async () => {
  const metrics = await collectCpu(null);

  assert.equal(typeof metrics.usagePercent, 'number');
  assert.equal(metrics.quotaCores, null);
  assert.equal(metrics.usedFraction, null);
  assert.ok(metrics.usagePercent >= 0, 'usagePercent must be >= 0');
});

test('cpu: usedFraction is calculated when quotaCores is set', async () => {
  const metrics = await collectCpu(2.0);

  assert.equal(typeof metrics.usedFraction, 'number');
  assert.ok((metrics.usedFraction ?? -1) >= 0, 'usedFraction must be >= 0');
  assert.equal(metrics.quotaCores, 2.0);
});

test('cpu: second call returns instantly (cache works)', async () => {
  await collectCpu(null); // warm up

  const start = Date.now();
  await collectCpu(null);
  const elapsed = Date.now() - start;

  assert.ok(elapsed < 20, `Second call took ${elapsed}ms — cache not working`);
});

test('cpu: usedFraction = (usagePercent/100) / quotaCores', async () => {
  await collectCpu(1.0); // warm up
  const metrics = await collectCpu(1.0);

  const expected = (metrics.usagePercent / 100) / 1.0;
  const actual = metrics.usedFraction ?? -1;
  assert.ok(Math.abs(actual - expected) < 0.0001, `Expected ${expected}, got ${actual}`);
});
