import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics to track POS Sync specific behavior
const pullLatency = new Trend('pos_pull_duration');
const pushLatency = new Trend('pos_push_duration');
const pullFailRate = new Rate('pos_pull_errors');
const pushFailRate = new Rate('pos_push_errors');
const dbQueryEstimate = new Counter('pos_estimated_db_queries');

// Load test configuration
export const options = {
  scenarios: {
    // Scenario 1: Constant background polling (Every device polling every 30s)
    background_polling: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 50 },  // Ramp up to 50 concurrent stores/devices
        { duration: '2m', target: 100 }, // Ramp up to 100 concurrent devices (Threshold where sequential queries degrade)
        { duration: '2m', target: 250 }, // Ramp up to 250 concurrent devices (Expected breaking point for unindexed DB)
        { duration: '1m', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '30s',
    },
    // Scenario 2: Spike test (Morning shift open / batch offline reconnect)
    morning_spike: {
      executor: 'spike',
      startTime: '6m',
      timeUnit: '1s',
      preAllocatedVUs: 500,
      maxVUs: 1000,
      stages: [
        { duration: '10s', target: 500 }, // 500 devices suddenly reconnecting and pushing/pulling simultaneously
        { duration: '1m', target: 500 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% of requests must complete below 2s
    'pos_pull_errors': ['rate<0.05'],    // Error rate must remain below 5%
    'pos_push_errors': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const TEST_ORG_ID = __ENV.ORG_ID || 'test-load-org-123';
const TEST_SYNC_KEY = __ENV.SYNC_KEY || 'default-sync-key';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // 1. Simulate pullEverythingFn (Executed every 30s by SyncEngine in src/lib/sync-engine.ts)
  // TanStack Start server functions expect RPC-style POST or GET payloads
  const pullPayload = JSON.stringify({
    data: {
      orgId: TEST_ORG_ID,
      syncKey: TEST_SYNC_KEY,
    }
  });

  const pullStart = Date.now();
  // Note: TanStack Start serverFn URL routing convention
  const pullRes = http.post(`${BASE_URL}/_server/pullEverythingFn`, pullPayload, { headers, tags: { name: 'pullEverything' } });
  const pullDuration = Date.now() - pullStart;

  pullLatency.add(pullDuration);
  
  // Each pullEverythingFn executes exactly 40 sequential database queries (1 org + 1 saasPlan + 38 tenant tables)
  dbQueryEstimate.add(40);

  const pullSuccess = check(pullRes, {
    'pull status is 200': (r) => r.status === 200,
    'pull returned success: true': (r) => {
      try {
        return JSON.parse(r.body).result?.success === true || JSON.parse(r.body).success === true;
      } catch (e) {
        return false;
      }
    },
  });

  if (!pullSuccess) {
    pullFailRate.add(1);
  } else {
    pullFailRate.add(0);
  }

  // 2. Simulate pushEverythingFn (20% of the time, device has local offline sales to push)
  if (Math.random() < 0.20) {
    const pushPayload = JSON.stringify({
      data: {
        orgId: TEST_ORG_ID,
        syncKey: TEST_SYNC_KEY,
        changes: {
          sales: [
            {
              id: `sale-${Date.now()}-${Math.random()}`,
              organizationId: TEST_ORG_ID,
              total: "150.00",
              items: 2,
              paymentMethod: "cash",
              status: "completed",
              date: new Date().toISOString(),
              saleItems: [
                { productId: "prod-1", productName: "Milk", quantity: 1, price: "50.00", total: "50.00" },
                { productId: "prod-2", productName: "Bread", quantity: 2, price: "50.00", total: "100.00" }
              ]
            }
          ]
        }
      }
    });

    const pushStart = Date.now();
    const pushRes = http.post(`${BASE_URL}/_server/pushEverythingFn`, pushPayload, { headers, tags: { name: 'pushEverything' } });
    const pushDuration = Date.now() - pushStart;

    pushLatency.add(pushDuration);
    // Pushing 1 sale with 2 items executes: 1 org auth query + 1 sale upsert + 1 delete items + 2 insert items = 5 DB queries
    dbQueryEstimate.add(5);

    const pushSuccess = check(pushRes, {
      'push status is 200': (r) => r.status === 200,
      'push returned success: true': (r) => {
        try {
          return JSON.parse(r.body).result?.success === true || JSON.parse(r.body).success === true;
        } catch (e) {
          return false;
        }
      },
    });

    if (!pushSuccess) {
      pushFailRate.add(1);
    } else {
      pushFailRate.add(0);
    }
  }

  // Simulate 30-second interval between syncs (with slight random jitter so devices don't pulse synchronously)
  sleep(25 + Math.random() * 10);
}
