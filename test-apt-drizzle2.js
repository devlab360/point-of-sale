require('dotenv').config();
const { db } = require('./src/db/index');
const schema = require('./src/db/schema');

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
