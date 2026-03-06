const http = require("http");

const SECTOR = process.env.SECTOR_NAME || "unknown";
const PORT = parseInt(process.env.PORT || "3000", 10);

const BASELINES = {
  northeast: { load: 62, freq: 60.02, voltage: 345, gens: 4, cap: 1240 },
  southeast: { load: 58, freq: 59.98, voltage: 348, gens: 3, cap: 980 },
  central:   { load: 71, freq: 60.01, voltage: 350, gens: 5, cap: 1580 },
  western:   { load: 55, freq: 59.99, voltage: 342, gens: 3, cap: 1100 },
};

const base = BASELINES[SECTOR] || { load: 60, freq: 60.0, voltage: 345, gens: 4, cap: 1000 };

const server = http.createServer((req, res) => {
  // CORS headers for direct browser access during dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/healthz" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (req.url === "/api/status") {
    const jitterLoad = (Math.random() - 0.5) * 8;
    const jitterFreq = (Math.random() - 0.5) * 0.06;
    const jitterVolt = (Math.random() - 0.5) * 6;
    const genVariance = Math.random() > 0.92 ? -1 : 0;

    const data = {
      sector: SECTOR,
      timestamp: Date.now(),
      load_pct: +(base.load + jitterLoad).toFixed(1),
      frequency_hz: +(base.freq + jitterFreq).toFixed(3),
      voltage_kv: +(base.voltage + jitterVolt).toFixed(1),
      generators_online: Math.max(1, base.gens + genVariance),
      generators_total: 5,
      capacity_mw: base.cap,
      status: "nominal",
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("not found");
});

// Simulate cold-start delay so Chaos Engineering pod-delete experiments
// produce a visible outage window on the dashboard (8 seconds).
const STARTUP_DELAY_MS = parseInt(process.env.STARTUP_DELAY_MS || "8000", 10);
console.log(`⚡ Grid sector [${SECTOR}] cold-starting (${STARTUP_DELAY_MS}ms delay)…`);
setTimeout(() => {
  server.listen(PORT, () => {
    console.log(`⚡ Grid sector [${SECTOR}] service ready on :${PORT}`);
  });
}, STARTUP_DELAY_MS);
