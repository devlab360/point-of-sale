import dotenv from 'dotenv';
dotenv.config();
import { db } from './src/db/index';
import * as schema from './src/db/schema';
import { eq, desc } from 'drizzle-orm';

async function test() {
  try {
    const res = await db
        .select()
        .from(schema.appointments)
        .orderBy(desc(schema.appointments.dateTime));
    console.log("Success:", res);
  } catch (e) {
    console.error("Select failed:", e);
  }
  process.exit(0);
}
test();
