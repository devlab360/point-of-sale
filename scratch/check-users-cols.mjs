import { config } from "dotenv";
config();

import { db } from "../src/db/index.js";

const result = await db.execute(`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'users' 
  ORDER BY ordinal_position
`);

console.log("Existing users columns:");
for (const row of result) {
  console.log(" -", row.column_name);
}

// Check which schema columns are missing
const schemaColumns = [
  'id', 'organization_id', 'name', 'role', 'email', 'last_active', 'status',
  'avatar', 'phone', 'location', 'joined', 'pin', 'permissions',
  'commission_rate', 'monthly_target', 'earned_commission',
  'email_verified', 'email_verification_token', 'country_code',
  'time_zone', 'date_format', 'language'
];

const existingCols = result.map((r) => r.column_name);
const missing = schemaColumns.filter(c => !existingCols.includes(c));
console.log("\nMissing columns:", missing);
