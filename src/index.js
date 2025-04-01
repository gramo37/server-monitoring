// /monitoring/node-backend/app.js
const express = require("express");
const client = require("prom-client");

const app = express();
const PORT = 4000;

// Collect default metrics
client.collectDefaultMetrics({ timeout: 5000 });

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.5, 1, 2, 5, 10], // Time buckets
});

const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of requests",
  labelNames: ["method", "route", "status_code"],
});

app.use((req, res, next) => {
  const start = process.hrtime();

  res.on("finish", () => {
    const duration = process.hrtime(start);
    const seconds = duration[0] + duration[1] / 1e9;

    httpRequestCounter.inc({
      method: req.method,
      route: req.originalUrl,
      status_code: res.statusCode,
    });

    httpRequestDuration.observe({
        method: req.method,
        route: req.originalUrl,
        status_code: res.statusCode,
      },
      seconds
    );
  });
  next();
});

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.get("/slow", (req, res) => {
  const delay = Math.floor(Math.random() * 10000); // Random delay up to 5 seconds
  const fail = Math.random() < 0.15; // 15% chance of failure

  setTimeout(() => {
    if (fail) {
      res.status(500).send({ error: "Random server error" });
    } else {
      res.send({ message: "Success", delay: `${delay}ms` });
    }
  }, delay);
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
