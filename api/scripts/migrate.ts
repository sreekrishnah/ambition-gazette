import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

dotenv.config();

// 001 and 002 were applied by hand before this runner existed. 003 is an empty placeholder.
const BASELINE = 3;

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Add the Supabase Postgres connection string to api/.env.');

  const dir = path.join(__dirname, '..', 'supabase', 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d{3}_.+\.sql$/.test(f))
    .filter((f) => Number(f.slice(0, 3)) > BASELINE)
    .sort();

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS public.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const done = new Set((await client.query<{ name: string }>('SELECT name FROM public.schema_migrations')).rows.map((r) => r.name));
    for (const file of files) {
      if (done.has(file)) continue;
      console.log(`applying ${file}`);
      await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
      await client.query('INSERT INTO public.schema_migrations (name) VALUES ($1)', [file]);
    }
    // PostgREST caches the schema; ask it to reload so new columns and functions are visible immediately.
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('migrations up to date');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
