import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Migrating database: Adding version column for Optimistic Locking...');
    
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;');
    await client.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;');
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;');
    await client.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;');

    console.log('✅ Migration complete!');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
