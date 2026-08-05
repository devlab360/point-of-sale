# POS Artistry — Scalability & Capacity Benchmarks

This directory contains production-grade load testing suites designed to measure the exact capacity, database query throughput, connection pool saturation, and breaking points of the **Offline-First + Dexie + Neon Sync** architecture.

## 1. Why Load Test This Architecture?

In an offline-first POS system where every client device polling `pullEverythingFn` every 30 seconds triggers **40 sequential database queries** without delta filtering or pagination, standard HTTP request-per-second (RPS) metrics do not reflect actual database load.

### The Math:

$$\text{DB Queries / Sec} = \text{HTTP RPS} \times 40$$

- At just **10 RPS** (~300 concurrent active stores polling every 30s), the server attempts to execute **400 database queries per second** sequentially over a 10-connection PostgreSQL pool (`drizzle-orm/postgres-js`).
- This test suite measures where connection pool starvation, memory exhaustion (from full JSON serialization), and database timeouts occur in your staging or local environment.

---

## 2. Prerequisites & Installation

### Option A: Using k6 (Recommended)

k6 is a high-performance load testing tool written in Go.

- **Windows (Winget)**: `winget install k6`
- **Windows (Chocolatey)**: `choco install k6`
- **Mac (Homebrew)**: `brew install k6`
- **Linux / Docker**: See [k6 installation guide](https://grafana.com/docs/k6/latest/get-started/installation/)

### Option B: Using Artillery

Artillery is a Node.js-based load testing tool.

```bash
npm install -g artillery@latest
```

---

## 3. Running the Benchmarks

### Step 1: Start Your Server

Run your application in development or production preview mode:

```bash
npm run dev
# OR for production preview:
npm run build && npm run preview
```

Ensure your database environment variable (`NEON_DB`) is configured and accessible.

### Step 2: Execute k6 Test Suite

Run the k6 script against your target URL:

```bash
k6 run -e BASE_URL=http://localhost:5173 -e ORG_ID=your-test-org benchmarks/k6-sync-load-test.js
```

**Key Custom Metrics Reported by k6:**

- `pos_pull_duration`: Time taken for the server to run 40 DB queries and serialize the entire store payload to JSON.
- `pos_push_duration`: Time taken to process offline sale upserts and nested item replacements.
- `pos_estimated_db_queries`: Total SQL statements executed against Neon PostgreSQL during the test run.
- `pos_pull_errors`: Rate of HTTP 500s, connection timeouts, or pool starvation errors.

### Step 3: Execute Artillery Test Suite

Alternatively, run the Artillery test:

```bash
artillery run benchmarks/artillery-sync-load-test.yml
```

---

## 4. Expected Results & Breaking Points (Before Optimization)

When testing against a standard serverless Postgres instance (Neon Free/Pro tier with default connection pool `max: 10`), you should observe the following thresholds:

| Concurrent VUs | Polling Interval | Approx HTTP RPS | Approx DB Queries/Sec | Expected Behavior & Status                                                                  |
| :------------- | :--------------- | :-------------- | :-------------------- | :------------------------------------------------------------------------------------------ |
| **50 VUs**     | 30s              | ~1.6 RPS        | ~66 QPS               | **Normal**: Latency ~400–700ms, 0% errors.                                                  |
| **150 VUs**    | 30s              | ~5.0 RPS        | ~200 QPS              | **Degraded**: Connection pool contention begins; latency jumps to 1.5s–3s.                  |
| **300 VUs**    | 30s              | ~10.0 RPS       | ~400 QPS              | **Severe Queueing**: Pool saturation. Latencies exceed 5s; initial 504/500 errors appear.   |
| **600+ VUs**   | 30s              | ~20.0 RPS       | ~800 QPS              | **Breaking Point**: Total connection pool starvation & V8 OOM / JSON serialization failure. |

---

## 5. Verifying Optimizations

After applying the architectural improvements detailed in the **Scalability & Capacity Analysis Report** (adding indexes on `organization_id`, converting sequential loops to `Promise.all`, and implementing timestamp-based Delta Sync), re-run this benchmark.

With Delta Sync and indexing enabled, the expected QPS per pull drops from **40 queries (full scan)** to **1 single lightweight timestamp query (index scan)**, increasing capacity by over **3,000%**.
