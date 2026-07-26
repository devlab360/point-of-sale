import postgres from "postgres";
import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";

// 1. Load Environment Variables from .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  envConfig.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
    }
  });
}

const connectionString = process.env.NEON_DB;
if (!connectionString) {
  console.error("❌ ERROR: NEON_DB connection string not found in .env");
  process.exit(1);
}

console.log("🚀 Starting POS Artistry Empirical Verification Suite...");
console.log("📊 Target Database: Neon PostgreSQL Serverless");

const sql = postgres(connectionString, { prepare: false, max: 10 });

const results = {
  timestamp: new Date().toISOString(),
  database_explain_analyze: [],
  sequential_vs_parallel_pull: {},
  memory_cpu_profiling: {},
  http_concurrency_benchmark: {},
};

async function runDatabaseExplainAnalyze() {
  console.log("\n--- [1/4] Running Database EXPLAIN ANALYZE ---");
  const testOrgId = "test-load-org-123";

  const queriesToTest = [
    { table: "sales", query: sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM sales WHERE organization_id = ${testOrgId}` },
    { table: "sale_items", query: sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM sale_items WHERE organization_id = ${testOrgId}` },
    { table: "products", query: sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM products WHERE organization_id = ${testOrgId}` },
    { table: "customers", query: sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM customers WHERE organization_id = ${testOrgId}` },
    { table: "inventory_movements", query: sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM inventory_movements WHERE organization_id = ${testOrgId}` },
  ];

  for (const item of queriesToTest) {
    try {
      const start = performance.now();
      const res = await item.query;
      const durationMs = (performance.now() - start).toFixed(2);
      const plan = res[0]["QUERY PLAN"][0];
      const planNode = plan["Plan"];
      
      const isSeqScan = JSON.stringify(planNode).includes("Seq Scan");
      
      const queryResult = {
        table: item.table,
        nodeType: planNode["Node Type"],
        isSequentialScan: isSeqScan,
        startupCost: planNode["Startup Cost"],
        totalCost: planNode["Total Cost"],
        planRows: planNode["Plan Rows"],
        actualRows: planNode["Actual Rows"],
        actualLoops: planNode["Actual Loops"],
        planningTimeMs: plan["Planning Time"] || 0,
        executionTimeMs: plan["Execution Time"] || 0,
        totalRoundtripMs: parseFloat(durationMs),
      };
      
      results.database_explain_analyze.push(queryResult);
      console.log(`✅ EXPLAIN ${item.table}: Node Type = ${queryResult.nodeType} | Seq Scan? ${isSeqScan ? "🚨 YES (Unindexed)" : "NO"} | Exec Time: ${queryResult.executionTimeMs}ms | Cost: ${queryResult.totalCost}`);
    } catch (err) {
      console.error(`❌ EXPLAIN failed for ${item.table}:`, err.message);
    }
  }
}

async function runSequentialVsParallelTest() {
  console.log("\n--- [2/4] Measuring Sequential vs Parallel 40-Table Pull Overhead ---");
  const testOrgId = "test-load-org-123";
  const tables = [
    'organizations', 'saas_plans', 'saas_sessions', 'invitations', 'users',
    'categories', 'brands', 'units', 'suppliers', 'products', 'customers',
    'sales', 'sale_items', 'purchases', 'purchase_items', 'inventory_movements',
    'settings', 'adjustments', 'transfers', 'expenses', 'coupons', 'gift_cards',
    'promotions', 'activity_log', 'notifications', 'held_invoices', 'sales_returns',
    'purchase_returns', 'locations', 'shifts', 'cash_movements', 'customer_ledgers',
    'supplier_ledgers', 'quotations', 'delivery_challans', 'accounts', 'vouchers',
    'repairs', 'subscriptions', 'rentals'
  ];

  // Measure Sequential (Current architecture in pullEverythingFn)
  const seqStart = performance.now();
  let seqSuccessCount = 0;
  for (const table of tables) {
    try {
      if (table === 'organizations') {
        await sql`SELECT * FROM organizations WHERE id = ${testOrgId} LIMIT 50`;
      } else if (table === 'saas_plans') {
        await sql`SELECT * FROM saas_plans LIMIT 50`;
      } else {
        await sql`SELECT * FROM ${sql(table)} WHERE organization_id = ${testOrgId} LIMIT 50`;
      }
      seqSuccessCount++;
    } catch (e) {
      // Table might not exist or slightly different column name in raw pg, handle gracefully
    }
  }
  const seqDurationMs = (performance.now() - seqStart).toFixed(2);

  // Measure Parallel (Promise.all best practice)
  const parStart = performance.now();
  const parQueries = tables.map(async (table) => {
    try {
      if (table === 'organizations') {
        return await sql`SELECT * FROM organizations WHERE id = ${testOrgId} LIMIT 50`;
      } else if (table === 'saas_plans') {
        return await sql`SELECT * FROM saas_plans LIMIT 50`;
      } else {
        return await sql`SELECT * FROM ${sql(table)} WHERE organization_id = ${testOrgId} LIMIT 50`;
      }
    } catch (e) {
      return null;
    }
  });
  await Promise.all(parQueries);
  const parDurationMs = (performance.now() - parStart).toFixed(2);

  const speedup = (parseFloat(seqDurationMs) / parseFloat(parDurationMs)).toFixed(2);
  results.sequential_vs_parallel_pull = {
    sequentialDurationMs: parseFloat(seqDurationMs),
    parallelDurationMs: parseFloat(parDurationMs),
    tablesQueried: tables.length,
    successfulQueries: seqSuccessCount,
    speedupFactor: `${speedup}x faster`,
  };

  console.log(`🕒 Sequential 40-Table Pull: ${seqDurationMs}ms`);
  console.log(`⚡ Parallel Promise.all Pull: ${parDurationMs}ms (${speedup}x speedup)`);
}

function runMemoryAndCpuProfiling() {
  console.log("\n--- [3/4] Profiling V8 CPU & Heap Memory Overhead of Double Serialization ---");
  
  // Simulate a realistic organization dataset (10,000 sales, 20,000 items, 5,000 products)
  console.log("Generating mock 35,000-record object hierarchy in memory...");
  const mockData = {
    sales: Array.from({ length: 10000 }, (_, i) => ({
      id: `sale-${i}`, organizationId: "org-1", total: "150.00", items: 2, date: new Date().toISOString(), status: "completed"
    })),
    saleItems: Array.from({ length: 20000 }, (_, i) => ({
      id: i, organizationId: "org-1", saleId: `sale-${Math.floor(i/2)}`, productId: `prod-${i%5000}`, price: "75.00", total: "75.00"
    })),
    products: Array.from({ length: 5000 }, (_, i) => ({
      id: `prod-${i}`, organizationId: "org-1", name: `Product Name ${i}`, sku: `SKU-${i}`, price: "75.00", stock: 100
    })),
  };

  const initialMemory = process.memoryUsage();
  
  const cpuStart = performance.now();
  // Execute exact line from sync-api.ts:L254
  const doubleSerialized = JSON.parse(JSON.stringify(mockData));
  const cpuDurationMs = (performance.now() - cpuStart).toFixed(2);

  const peakMemory = process.memoryUsage();

  const heapUsedMB = ((peakMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2);
  const rssMB = ((peakMemory.rss - initialMemory.rss) / 1024 / 1024).toFixed(2);

  results.memory_cpu_profiling = {
    recordsSimulated: 35000,
    doubleSerializationCpuTimeMs: parseFloat(cpuDurationMs),
    initialHeapMB: (initialMemory.heapUsed / 1024 / 1024).toFixed(2),
    peakHeapMB: (peakMemory.heapUsed / 1024 / 1024).toFixed(2),
    heapGrowthMB: parseFloat(heapUsedMB),
    rssGrowthMB: parseFloat(rssMB),
  };

  console.log(`🧠 Double Serialization CPU Time: ${cpuDurationMs}ms`);
  console.log(`📈 V8 Heap Memory Spike: +${heapUsedMB} MB | Total RSS Spike: +${rssMB} MB`);
}

async function runHttpConcurrencyBenchmark() {
  console.log("\n--- [4/4] Probing Local Dev Server Concurrency & Latency ---");
  
  const portsToTest = [5173, 3000, 8080];
  let activePort = null;

  for (const port of portsToTest) {
    try {
      const res = await fetch(`http://localhost:${port}/_server/pullEverythingFn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { orgId: "test", syncKey: "test" } }),
      });
      if (res.status === 200 || res.status === 500 || res.status === 400) {
        activePort = port;
        break;
      }
    } catch (e) {
      // Port not responding
    }
  }

  if (!activePort) {
    console.log("⚠️ Local dev server not reachable on 5173, 3000, or 8080. Skipping HTTP concurrency probe.");
    results.http_concurrency_benchmark = { status: "Server not running or unreachable during script execution" };
    return;
  }

  console.log(`🎯 Found active server on port ${activePort}. Executing concurrency burst test...`);
  const targetUrl = `http://localhost:${activePort}/_server/pullEverythingFn`;
  const payload = JSON.stringify({ data: { orgId: "test-load-org-123", syncKey: "default-sync-key" } });

  const concurrencyLevels = [1, 5, 10, 20];
  const benchmarkResults = [];

  for (const concurrency of concurrencyLevels) {
    const start = performance.now();
    const requests = Array.from({ length: concurrency }, () =>
      fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).then(async (r) => {
        const text = await r.text();
        return { status: r.status, ok: r.ok, bodyLen: text.length };
      }).catch((err) => ({ status: 0, ok: false, error: err.message }))
    );

    const responses = await Promise.all(requests);
    const totalTimeMs = performance.now() - start;
    const successful = responses.filter((r) => r.ok && r.status === 200).length;
    const rps = (concurrency / (totalTimeMs / 1000)).toFixed(2);
    const avgLatencyMs = (totalTimeMs / concurrency).toFixed(2);

    benchmarkResults.push({
      concurrency,
      successfulRequests: successful,
      failedRequests: concurrency - successful,
      totalDurationMs: parseFloat(totalTimeMs.toFixed(2)),
      avgLatencyMs: parseFloat(avgLatencyMs),
      measuredRps: parseFloat(rps),
    });

    console.log(`⚡ Concurrency ${concurrency}: Avg Latency = ${avgLatencyMs}ms | Measured RPS = ${rps} | Success: ${successful}/${concurrency}`);
  }

  results.http_concurrency_benchmark = {
    targetPort: activePort,
    results: benchmarkResults,
  };
}

async function main() {
  try {
    await runDatabaseExplainAnalyze();
    await runSequentialVsParallelTest();
    runMemoryAndCpuProfiling();
    await runHttpConcurrencyBenchmark();
    
    const outputPath = path.resolve(process.cwd(), "benchmarks/empirical_results.json");
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n✨ Empirical verification complete! Results saved to: ${outputPath}`);
  } catch (err) {
    console.error("❌ Test suite encountered a fatal error:", err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
