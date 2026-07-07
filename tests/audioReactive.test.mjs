import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateSpectrumFromFrequencyData,
  calculatePulseFromFrequencyData,
  smoothSpectrum,
  smoothPulse
} from '../src/audioReactive.mjs';

test('calculatePulseFromFrequencyData converts bins into a zero to one pulse', () => {
  assert.equal(calculatePulseFromFrequencyData(new Uint8Array([0, 0, 0])), 0);
  assert.equal(calculatePulseFromFrequencyData(new Uint8Array([255, 255, 255])), 1);
  assert.equal(calculatePulseFromFrequencyData(new Uint8Array([0, 128, 255])), 0.5);
});

test('smoothPulse moves gradually toward the next value', () => {
  assert.equal(smoothPulse(0, 1, 0.25), 0.25);
  assert.equal(smoothPulse(1, 0, 0.25), 0.75);
});

test('calculateSpectrumFromFrequencyData separates bass, mid, treble, and pulse', () => {
  assert.deepEqual(
    calculateSpectrumFromFrequencyData(new Uint8Array([255, 255, 255, 0, 0, 0, 0, 0, 0])),
    { bass: 1, mid: 0, treble: 0, pulse: 0.5 }
  );

  assert.deepEqual(
    calculateSpectrumFromFrequencyData(new Uint8Array([0, 0, 0, 255, 255, 255, 0, 0, 0])),
    { bass: 0, mid: 1, treble: 0, pulse: 0.32 }
  );
});

test('smoothSpectrum rises faster than it falls', () => {
  const result = smoothSpectrum(
    { bass: 0.2, mid: 0.2, treble: 0.2, pulse: 0.2 },
    { bass: 1, mid: 0, treble: 0.4, pulse: 0.8 },
    { rise: 0.5, fall: 0.25 }
  );

  assert.deepEqual(result, { bass: 0.6, mid: 0.15, treble: 0.3, pulse: 0.5 });
});
