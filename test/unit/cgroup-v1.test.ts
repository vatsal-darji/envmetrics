import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'os';
import { parseMemoryLimitV1, parseCpuQuotaV1 } from '../../src/limits/cgroup-v1.js';

test('parseMemoryLimitV1: parses a normal byte value', () => {
  assert.equal(parseMemoryLimitV1('268435456\n'), 268435456);
});

test('parseMemoryLimitV1: large sentinel falls back to os.totalmem()', () => {
  assert.equal(parseMemoryLimitV1('9223372036854771712\n'), os.totalmem());
});

test('parseMemoryLimitV1: garbage content falls back to os.totalmem()', () => {
  assert.equal(parseMemoryLimitV1('bad\n'), os.totalmem());
});

test('parseCpuQuotaV1: -1 quota returns null (unlimited)', () => {
  assert.equal(parseCpuQuotaV1('-1\n', '100000\n'), null);
});

test('parseCpuQuotaV1: parses quota/period into core fraction', () => {
  const result = parseCpuQuotaV1('50000\n', '100000\n');
  assert.ok(result !== null);
  assert.ok(Math.abs(result - 0.5) < 0.0001);
});

test('parseCpuQuotaV1: garbage quota returns null', () => {
  assert.equal(parseCpuQuotaV1('bad\n', '100000\n'), null);
});

test('parseCpuQuotaV1: garbage period returns null', () => {
  assert.equal(parseCpuQuotaV1('50000\n', 'bad\n'), null);
});
