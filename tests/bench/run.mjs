#!/usr/bin/env node
// AC-14: tinybench harness — ≥1000 samples/dim, 100-iter warmup, p50/p95/p99 + 95% CI.
// Fails on any dim > 10% regression vs baseline.json OR sum of regressions > 20%.
import { Bench } from 'tinybench';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = resolve(__dirname, 'baseline.json');
const SAMPLES = 1000;
const WARMUP = 100;
const PER_DIM_REGRESSION_CAP = 0.10;
const COMPOUNDED_CAP = 0.20;

// --- benchmark dimensions ---

const bench = new Bench({ iterations: SAMPLES, warmupIterations: WARMUP });

bench.add('no-op baseline', () => {
  // Fastest possible — establishes runner floor
});

bench.add('JSON.parse small', () => {
  JSON.parse('{"type":"content","text":"hello"}');
});

bench.add('JSON.stringify small', () => {
  JSON.stringify({ type: 'content', text: 'hello' });
});

bench.add('string split + trim', () => {
  '/provider claude'.trim().split(/\s+/);
});

await bench.run();

// --- percentile computation ---

function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

function ciHalfWidth(stdDev, n, zScore = 1.96) {
  return zScore * (stdDev / Math.sqrt(n));
}

const results = {};

for (const task of bench.tasks) {
  const times = task.result?.samples ?? [];
  const sorted = [...times].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  results[task.name] = {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    mean,
    stdDev,
    ci95HalfWidth: ciHalfWidth(stdDev, n),
    samples: n,
  };
}

console.log('\nBenchmark results (ns):');
console.table(
  Object.fromEntries(
    Object.entries(results).map(([name, r]) => [
      name,
      {
        p50: r.p50.toFixed(2),
        p95: r.p95.toFixed(2),
        p99: r.p99.toFixed(2),
        '±CI95': r.ci95HalfWidth.toFixed(2),
      },
    ])
  )
);

// --- regression gate (T-25) ---

if (!existsSync(BASELINE_PATH)) {
  writeFileSync(BASELINE_PATH, JSON.stringify(results, null, 2));
  console.log(`\nBaseline written to ${BASELINE_PATH}`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));

let totalRegression = 0;
const regressions = [];

for (const [dim, current] of Object.entries(results)) {
  const base = baseline[dim];
  if (!base) continue;
  const regFraction = (current.p95 - base.p95) / base.p95;
  if (regFraction > PER_DIM_REGRESSION_CAP) {
    regressions.push(
      `  ${dim}: p95 ${current.p95.toFixed(2)}ns vs baseline ${base.p95.toFixed(2)}ns ` +
      `(+${(regFraction * 100).toFixed(1)}% > ${PER_DIM_REGRESSION_CAP * 100}% cap)`
    );
  }
  if (regFraction > 0) totalRegression += regFraction;
}

let failed = false;

if (regressions.length > 0) {
  console.error('\nREGRESSION FAIL — per-dimension cap exceeded:');
  regressions.forEach(r => console.error(r));
  failed = true;
}

if (totalRegression > COMPOUNDED_CAP) {
  console.error(
    `\nREGRESSION FAIL — compounded regression ${(totalRegression * 100).toFixed(1)}% ` +
    `> ${COMPOUNDED_CAP * 100}% cap (AC-14 §7.1)`
  );
  failed = true;
}

if (failed) process.exit(1);

console.log('\nBench gate PASS — no regressions detected');
