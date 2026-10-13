/* ============================================================================
   Regenerates the illustrative sample series used by the equity-curve panel in
   index.html, and prints the numbers that must be pasted back into the page:

     - the SVG path `d` attributes (two: the stroke and the area fill)
     - the SERIES array and GEO constants used by assets/js/main.js

   Deterministic: same seed, same output. Run with `node tools/gen-series.js`.

   This is synthetic data. It is not a real backtest, a real portfolio or a
   performance record, and it must never be presented as one.
   ========================================================================== */

let seed = 20260101;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

const N = 120;
const values = [100];
let vol = 0.011;

for (let i = 1; i < N; i++) {
  // Regimes: build, drawdown, recovery, chop, rally.
  let drift = 0.0026;
  if (i >= 38 && i < 56) drift = -0.0075;
  else if (i >= 56 && i < 74) drift = 0.0055;
  else if (i >= 74 && i < 92) drift = 0.0004;
  else if (i >= 92) drift = 0.0042;

  if (i % 37 === 0) vol = 0.01 + rnd() * 0.012;

  const shock = (rnd() + rnd() + rnd() - 1.5) * 1.3; // ~normal, mean 0
  values.push(Math.max(values[i - 1] * (1 + drift + vol * shock), 40));
}

const GEO = { x0: 44, x1: 620, y0: 30, y1: 208 };
const vmin = Math.min(...values);
const vmax = Math.max(...values);
const pad = (vmax - vmin) * 0.07;
GEO.lo = vmin - pad;
GEO.hi = vmax + pad;

const round2 = (n) => Math.round(n * 100) / 100;
const px = (i) => GEO.x0 + (i * (GEO.x1 - GEO.x0)) / (N - 1);
const py = (v) => GEO.y1 - ((v - GEO.lo) / (GEO.hi - GEO.lo)) * (GEO.y1 - GEO.y0);

const stroke = values
  .map((v, i) => `${i ? "L" : "M"}${round2(px(i))} ${round2(py(v))}`)
  .join(" ");
const area = `${stroke} L${GEO.x1} ${GEO.y1} L${GEO.x0} ${GEO.y1} Z`;

const peakToDate = [];
let running = -Infinity;
let maxDD = 0;
for (const v of values) {
  running = Math.max(running, v);
  peakToDate.push((v / running - 1) * 100);
  maxDD = Math.min(maxDD, (v / running - 1) * 100);
}

console.log("/* --- paste into index.html: the <path> stroke --- */");
console.log(stroke);
console.log("\n/* --- paste into index.html: the <path> area fill --- */");
console.log(area);
console.log("\n/* --- paste into assets/js/main.js --- */");
console.log("var SERIES = " + JSON.stringify(values.map(round2)) + ";");
console.log(
  "var GEO = { x0: " + GEO.x0 + ", x1: " + GEO.x1 + ", y0: " + GEO.y0 +
  ", y1: " + GEO.y1 + ", lo: " + round2(GEO.lo) + ", hi: " + round2(GEO.hi) + " };"
);
console.log("\n/* --- sanity check --- */");
console.log("start   " + round2(values[0]));
console.log("peak    " + round2(vmax));
console.log("trough  " + round2(vmin));
console.log("end     " + round2(values[N - 1]));
console.log("maxDD   " + maxDD.toFixed(2) + "%");
