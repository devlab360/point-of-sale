import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_qd1VM8nOtjxI@ep-silent-cloud-axb43d7u-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function check() {
  try {
    const res = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'subscription_payments'`;
    console.log("Table check:", res);
    
    if (res.length > 0) {
      const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'subscription_payments'`;
      console.log("Columns:", cols);
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

check();
