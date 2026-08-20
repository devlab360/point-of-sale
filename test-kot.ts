import dotenv from 'dotenv';
dotenv.config();
import { db } from './src/db/index';
import * as schema from './src/db/schema';
import { v4 as uuidv4 } from 'uuid';

async function test() {
  try {
    const res = await db.insert(schema.kitchenOrderTickets).values({
      id: uuidv4(),
      organizationId: 'test-org',
      tableId: null,
      waiterId: 'test-user',
      items: [{ name: 'Test Item' }],
      status: 'pending',
      note: 'test note'
    }).returning();
    console.log("Success:", res);
  } catch (e) {
    console.error("Insert failed:", e);
  }
  process.exit(0);
}
test();
