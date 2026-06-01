import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectMemory } from '../../src/collectors/memory.js';

test('memory: usedFraction = rss / limitBytes', () => {
  const usage = process.memoryUsage();
  const limit = usage.rss * 2; // set limit to 2x current rss → fraction should be ~0.5
  const metrics = collectMemory(limit);

  assert.ok(metrics.usedFraction > 0, 'usedFraction should be > 0');
  assert.ok(metrics.usedFraction <= 1, 'usedFraction should be <= 1');
  assert.equal(metrics.limitBytes, limit);
});

test('memory: usedFraction is clamped to 1 when rss exceeds limit', () => {
  const usage = process.memoryUsage();
  const tinyLimit = 1; // absurdly small so rss definitely exceeds it
  const metrics = collectMemory(tinyLimit);

  assert.equal(metrics.usedFraction, 1, 'usedFraction must be clamped to 1');
});

test('memory: all fields are present and are numbers', () => {
  const metrics = collectMemory(1024 * 1024 * 512);

  assert.equal(typeof metrics.rss, 'number');
  assert.equal(typeof metrics.heapUsed, 'number');
  assert.equal(typeof metrics.heapTotal, 'number');
  assert.equal(typeof metrics.external, 'number');
  assert.equal(typeof metrics.limitBytes, 'number');
  assert.equal(typeof metrics.usedFraction, 'number');
});
