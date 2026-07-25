import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const sql = postgres(process.env.NEON_DB);

async function run() {
  try {
    await sql`TRUNCATE TABLE organizations CASCADE`;
    await sql`INSERT INTO organizations (id, name, owner_email, status, current_plan_id, sync_key) VALUES ('default', 'Default Org', 'test@test.com', 'active', 'free', 'default-sync-key') ON CONFLICT (id) DO NOTHING`;
    console.log('Truncated all tables and inserted default organization');
  } catch (e) {
    console.error(e);
  } finally {
    sql.end();
  }
}

run();
