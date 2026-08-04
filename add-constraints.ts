import * as dotenv from 'dotenv';
dotenv.config();
import postgres from 'postgres';

const connectionString = process.env.NEON_DB || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(connectionString);

async function main() {
  console.log('Adding constraints and indexes...');
  
  const queries = [
    // Indexes
    `CREATE INDEX IF NOT EXISTS products_category_idx ON products (category);`,
    `CREATE INDEX IF NOT EXISTS products_brand_idx ON products (brand);`,
    `CREATE INDEX IF NOT EXISTS sales_salesman_idx ON sales (salesman_id);`,
    `CREATE INDEX IF NOT EXISTS purchases_org_date_idx ON purchases (organization_id, date);`,
    `CREATE INDEX IF NOT EXISTS purchases_supplier_idx ON purchases (supplier_id);`,
    
    // Foreign Keys - wrap in DO block to catch if already exists
    `
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_category_fkey') THEN
            ALTER TABLE products ADD CONSTRAINT products_category_fkey FOREIGN KEY (category) REFERENCES categories(id);
        END IF;
    END $$;
    `,
    `
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_brand_fkey') THEN
            ALTER TABLE products ADD CONSTRAINT products_brand_fkey FOREIGN KEY (brand) REFERENCES brands(id);
        END IF;
    END $$;
    `,
    `
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_unit_fkey') THEN
            ALTER TABLE products ADD CONSTRAINT products_unit_fkey FOREIGN KEY (unit) REFERENCES units(id);
        END IF;
    END $$;
    `,
    `
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_customer_id_fkey') THEN
            ALTER TABLE sales ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id);
        END IF;
    END $$;
    `,
    `
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_salesman_id_fkey') THEN
            ALTER TABLE sales ADD CONSTRAINT sales_salesman_id_fkey FOREIGN KEY (salesman_id) REFERENCES users(id);
        END IF;
    END $$;
    `,
    `
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_product_id_fkey') THEN
            ALTER TABLE sale_items ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
        END IF;
    END $$;
    `,
    `
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchases_supplier_id_fkey') THEN
            ALTER TABLE purchases ADD CONSTRAINT purchases_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
        END IF;
    END $$;
    `,
    `
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_items_product_id_fkey') THEN
            ALTER TABLE purchase_items ADD CONSTRAINT purchase_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id);
        END IF;
    END $$;
    `
  ];

  for (let i = 0; i < queries.length; i++) {
    try {
      await sql.unsafe(queries[i]);
      console.log('Success on query: ' + (i+1));
    } catch (e: any) {
      console.error('Failed on query: ' + (i+1), e.message);
    }
  }

  console.log('Done!');
  process.exit(0);
}

main();
