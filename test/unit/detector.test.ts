import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectEnvironment, resetDetectorCache } from '../../src/detector.js';

test('detector: returns a valid environment string', async () => {
  resetDetectorCache();
  const env = await detectEnvironment();
  const valid = ['cgroup-v2', 'cgroup-v1', 'os-only'];
  assert.ok(valid.includes(env), `Expected one of ${valid.join(', ')}, got "${env}"`);
});

test('detector: returns the same result on repeated calls (cache)', async () => {
  resetDetectorCache();
  const first = await detectEnvironment();
  const second = await detectEnvironment();
  const third = await detectEnvironment();
  assert.equal(first, second);
  assert.equal(second, third);
});

test('detector: on macOS/non-Linux returns os-only', async () => {
  if (process.platform !== 'linux') {
    resetDetectorCache();
    const env = await detectEnvironment();
    assert.equal(env, 'os-only');
  }
});
