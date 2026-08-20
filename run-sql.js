import dotenv from 'dotenv';
dotenv.config();
import postgres from 'postgres';

const sql = postgres(process.env.NEON_DB);

async function check() {
  try {
    console.log("Fixing tables...");
    await sql`DROP TABLE IF EXISTS appointments CASCADE;`;
    await sql`DROP TABLE IF EXISTS restaurant_tables CASCADE;`;
    await sql`DROP TABLE IF EXISTS kitchen_order_tickets CASCADE;`;

    await sql`
      CREATE TABLE IF NOT EXISTS appointments (
        id text PRIMARY KEY,
        organization_id text NOT NULL,
        customer_id text,
        customer_name text NOT NULL,
        customer_phone text,
        service_id text,
        service_name text NOT NULL,
        staff_id text,
        staff_name text,
        date_time text NOT NULL,
        end_time text NOT NULL,
        status text NOT NULL DEFAULT 'scheduled',
        notes text,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS restaurant_tables (
        id text PRIMARY KEY,
        organization_id text NOT NULL,
        name text NOT NULL,
        capacity integer NOT NULL DEFAULT 4,
        status text NOT NULL DEFAULT 'available',
        current_order_id text,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS kitchen_order_tickets (
        id text PRIMARY KEY,
        organization_id text NOT NULL,
        table_id text,
        waiter_id text,
        items jsonb NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        note text,
        timestamp timestamp NOT NULL DEFAULT now(),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `;
    console.log("Tables recreated successfully!");
  } catch (e) {
    console.error("Query failed:", e);
  } finally {
    await sql.end();
  }
}
check();
