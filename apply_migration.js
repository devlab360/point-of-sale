import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const sql = postgres('postgresql://neondb_owner:npg_qd1VM8nOtjxI@ep-silent-cloud-axb43d7u-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function runMigration() {
  try {
    const migrationPath = path.resolve('src/db/migrations/0008_fantastic_blockbuster.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split statements by --> statement-breakpoint
    const statements = sqlContent.split('--> statement-breakpoint');
    
    for (let statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        console.log("Executing:", trimmed.substring(0, 50) + "...");
        try {
          await sql.unsafe(trimmed);
          console.log("Success.");
        } catch (err) {
          console.error("Failed:", err.message);
        }
      }
    }
    
    console.log("Migration complete.");
  } catch(e) {
    console.error("Migration script error:", e);
  } finally {
    process.exit(0);
  }
}

runMigration();
