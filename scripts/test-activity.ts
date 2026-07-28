import { db } from "../src/db";
import { activityLog, organizations } from "../src/db/schema";

async function main() {
  try {
    const insertData = {
      id: "act_test_123",
      organizationId: "default",
      user: "Test User",
      action: "Test Action",
      details: "Test Details",
      timestamp: new Date().toISOString(),
      type: "invoice"
    };
    
    const tableColumns = Object.keys(activityLog);
    console.log("tableColumns keys:", tableColumns);
    
    // Simulate what sync-api.ts does
    const filteredData: any = {};
    for (const key of Object.keys(insertData)) {
      if (key !== "id" && !tableColumns.includes(key)) {
        // Drop it
      } else {
        filteredData[key] = (insertData as any)[key];
      }
    }
    console.log("filteredData:", filteredData);
    
    await db.insert(activityLog).values(filteredData)
      .onConflictDoUpdate({
        target: activityLog.id,
        set: { user: "Test User" }
      });
      
    console.log("Insert successful!");
  } catch (e) {
    console.error("Insert failed:", e);
  }
}
main().then(() => process.exit(0));
