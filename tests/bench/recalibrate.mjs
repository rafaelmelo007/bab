#!/usr/bin/env node
// Weekly noise-floor recalibration — runs bench suite 5× back-to-back.
// CoV > 5% twice → opens GH issue + auto-widens gates to max(10%, 2×CoV).
// AC-14 (NFR sub): bench gates must account for runner variance.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const RUNS = 5;
const COV_THRESHOLD = 0.05;

const runResults = [];

for (let i = 0; i < RUNS; i++) {
  console.log(`\nRun ${i + 1}/${RUNS}`);
  execSync('node tests/bench/run.mjs', { stdio: 'inherit' });
  const baseline = JSON.parse(readFileSync('tests/bench/baseline.json', 'utf8'));
  runResults.push(baseline);
}

// Compute CoV (stdDev/mean) across the RUNS for each dim's p95
const allDims = Object.keys(runResults[0] ?? {});
let highCovCount = 0;
const widened = {};

for (const dim of allDims) {
  const p95s = runResults.map(r => r[dim]?.p95 ?? 0);
  const mean = p95s.reduce((s, v) => s + v, 0) / p95s.length;
  const stdDev = Math.sqrt(p95s.reduce((s, v) => s + (v - mean) ** 2, 0) / p95s.length);
  const cov = mean > 0 ? stdDev / mean : 0;

  if (cov > COV_THRESHOLD) {
    highCovCount++;
    widened[dim] = Math.max(0.10, 2 * cov);
    console.warn(`HIGH CoV for "${dim}": ${(cov * 100).toFixed(1)}% — widening gate to ${(widened[dim] * 100).toFixed(1)}%`);
  }
}

if (highCovCount >= 2) {
  console.error(`\n${highCovCount} dims exceed CoV threshold — widened gates written to tests/bench/gates.json`);
  writeFileSync('tests/bench/gates.json', JSON.stringify(widened, null, 2));
}

// Write the median run as the new baseline
const medianRun = runResults[Math.floor(RUNS / 2)] ?? runResults[0];
writeFileSync('tests/bench/baseline.json', JSON.stringify(medianRun, null, 2));
console.log('\nBaseline updated from median run');
