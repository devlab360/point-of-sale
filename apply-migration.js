import dotenv from 'dotenv';
dotenv.config();
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const sql = postgres(process.env.NEON_DB);

async function runMigration() {
  try {
    console.log("Running migration...");
    const migrationFile = path.resolve('src/db/migrations/0007_loud_beyonder.sql');
    const sqlText = fs.readFileSync(migrationFile, 'utf8');
    
    const statements = sqlText.split('--> statement-breakpoint');
    
    for (const stmt of statements) {
      if (stmt.trim()) {
        console.log("Executing:", stmt.trim().substring(0, 50) + "...");
        await sql.unsafe(stmt.trim());
      }
    }
    
    console.log("Migration applied successfully!");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    await sql.end();
  }
}

runMigration();
