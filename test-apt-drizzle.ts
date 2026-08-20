import dotenv from 'dotenv';
dotenv.config();
import { db } from './src/db/index';
import * as schema from './src/db/schema';

async function test() {
  try {
    const res = await db.select().from(schema.appointments);
    console.log("Success:", res);
  } catch (e) {
    console.error("Select failed:", e);
  }
  process.exit(0);
}
test();
