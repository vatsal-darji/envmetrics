import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'os';
import { parseMemoryMax, parseCpuMax } from '../../src/limits/cgroup-v2.js';

test('parseMemoryMax: parses a normal byte value', () => {
  assert.equal(parseMemoryMax('268435456\n'), 268435456);
});

test('parseMemoryMax: "max" falls back to os.totalmem()', () => {
  assert.equal(parseMemoryMax('max\n'), os.totalmem());
});

test('parseMemoryMax: garbage content falls back to os.totalmem()', () => {
  assert.equal(parseMemoryMax('not-a-number\n'), os.totalmem());
});

test('parseCpuMax: parses quota/period into core fraction', () => {
  const result = parseCpuMax('50000 100000\n');
  assert.ok(result !== null);
  assert.ok(Math.abs(result - 0.5) < 0.0001);
});

test('parseCpuMax: "max" quota returns null', () => {
  assert.equal(parseCpuMax('max 100000\n'), null);
});

test('parseCpuMax: malformed content returns null', () => {
  assert.equal(parseCpuMax('bad\n'), null);
});

test('parseCpuMax: 200000/100000 = 2 cores', () => {
  const result = parseCpuMax('200000 100000\n');
  assert.ok(result !== null);
  assert.ok(Math.abs(result - 2.0) < 0.0001);
});
