/*
  Streaming CSV → Supabase importer with optional dynamic DDL

  Features:
  - Loads SUPABASE_URL / SUPABASE_API_KEY from .env
  - Streams CSV (memory friendly)
  - Normalizes simple types (empty → null, numeric strings → numbers, boolean/date detection)
  - Inserts in batches with backpressure (stream pause/resume + basic retry)
  - Optional dynamic DDL via existing RPC: create_table_from_json
  - Helpful progress logs & error summary

  Usage examples:
    node backend/scripts/csv_import.js --file data.csv --table public.hces_data --create
    node backend/scripts/csv_import.js --file data.csv --table public.hces_data --batch 2000
*/

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const csv = require('csv-parser');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { supabase, surveyDataService } = require('../config/supabase');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { batch: 1000, sample: 200, create: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === '--file' || arg === '-f') opts.file = next, i += 1;
    else if (arg === '--table' || arg === '-t') opts.table = next, i += 1;
    else if (arg === '--batch' || arg === '-b') opts.batch = parseInt(next, 10) || 1000, i += 1;
    else if (arg === '--sample') opts.sample = parseInt(next, 10) || 200, i += 1;
    else if (arg === '--create') opts.create = true;
    else if (arg === '--schema') opts.schema = next, i += 1; // fallback if table given without schema
  }
  if (!opts.file || !opts.table) {
    console.error('Usage: node backend/scripts/csv_import.js --file <csvPath> --table <schema.table> [--create] [--batch 1000] [--sample 200]');
    process.exit(1);
  }
  if (!opts.table.includes('.')) {
    const schema = opts.schema || 'public';
    opts.table = `${schema}.${opts.table}`;
  }
  return opts;
}

function detectType(value) {
  if (value === null || value === undefined) return 'NULL';
  if (value === '') return 'NULL';
  const lower = String(value).toLowerCase();
  if (lower === 'true' || lower === 'false') return 'BOOLEAN';
  // integer
  if (/^-?\d+$/.test(value)) return 'INTEGER';
  // numeric/float
  if (/^-?\d*\.\d+$/.test(value)) return 'NUMERIC';
  // ISO date/time
  if (!Number.isNaN(Date.parse(value))) return 'TIMESTAMPTZ';
  return 'TEXT';
}

function pickWiderType(typeA, typeB) {
  const order = ['NULL', 'BOOLEAN', 'INTEGER', 'NUMERIC', 'TIMESTAMPTZ', 'TEXT'];
  return order.indexOf(typeA) >= order.indexOf(typeB) ? typeA : typeB;
}

function inferColumnTypes(sampleRows) {
  if (sampleRows.length === 0) return {};
  const columns = Object.keys(sampleRows[0]);
  const typeMap = {};
  columns.forEach((col) => { typeMap[col] = 'NULL'; });
  sampleRows.forEach((row) => {
    columns.forEach((col) => {
      const v = row[col];
      const t = detectType(v);
      typeMap[col] = pickWiderType(typeMap[col], t);
    });
  });
  // Map to Postgres types
  const pgMap = {
    NULL: 'TEXT', // default to TEXT
    BOOLEAN: 'BOOLEAN',
    INTEGER: 'INTEGER',
    NUMERIC: 'NUMERIC',
    TIMESTAMPTZ: 'TIMESTAMPTZ',
    TEXT: 'TEXT'
  };
  const ddl = columns.map((name) => ({ name, type: pgMap[typeMap[name]] || 'TEXT' }));
  return ddl;
}

function normalizeValue(value) {
  if (value === undefined || value === null) return null;
  if (value === '') return null;
  const lower = String(value).toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d*\.\d+$/.test(value)) return parseFloat(value);
  // Keep strings as-is
  return value;
}

function normalizeRow(row) {
  const normalized = {};
  Object.keys(row).forEach((k) => { normalized[k] = normalizeValue(row[k]); });
  return normalized;
}

async function ensureTable(tableName, sampleRows) {
  const columns = inferColumnTypes(sampleRows);
  const payload = {
    if_not_exists: true,
    columns,
    dest_table: tableName
  };
  console.log('🔧 Creating/ensuring table via RPC create_table_from_json:', payload);
  const result = await surveyDataService.createTableFromJson(payload);
  console.log('✅ DDL result:', result);
}

async function insertBatch(tableName, rows) {
  if (rows.length === 0) return { inserted: 0 };
  const url = `/${tableName}`; // axios instance already has /rest/v1 base
  const headers = { Prefer: 'return=minimal' };
  let attempt = 0;
  const maxAttempts = 5;
  /* simple retry with exponential backoff */
  while (true) {
    try {
      await supabase.post(url, rows, { headers });
      return { inserted: rows.length };
    } catch (err) {
      attempt += 1;
      const status = err.response?.status;
      const msg = err.response?.data || err.message;
      if (attempt >= maxAttempts || (status && status < 500 && status !== 429)) {
        throw new Error(`Insert failed (attempt ${attempt}): ${status || ''} ${JSON.stringify(msg)}`);
      }
      const delayMs = Math.min(30000, 500 * 2 ** attempt);
      console.warn(`⚠️ Insert error (status ${status}). Retrying in ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function main() {
  const opts = parseArgs();
  const filePath = path.resolve(process.cwd(), opts.file);
  if (!fs.existsSync(filePath)) {
    console.error(`CSV not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`📥 Importing CSV → ${opts.table}`);
  console.log(`• File: ${filePath}`);
  console.log(`• Batch size: ${opts.batch}`);
  console.log(`• Create table: ${opts.create ? 'yes' : 'no'}`);

  const sampleRows = [];
  let total = 0;
  let inserted = 0;
  let batch = [];
  let headers = null;
  let streamPausedForInsert = false;

  const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
  rl.on('close', () => {});

  const readStream = fs.createReadStream(filePath);
  const parser = readStream.pipe(csv());

  parser.on('headers', (h) => { headers = h; });

  parser.on('data', async (row) => {
    try {
      total += 1;
      if (sampleRows.length < opts.sample) sampleRows.push({ ...row });
      const normalized = normalizeRow(row);
      batch.push(normalized);

      if (batch.length >= opts.batch && !streamPausedForInsert) {
        parser.pause();
        streamPausedForInsert = true;

        if (opts.create && total <= opts.batch) {
          await ensureTable(opts.table, sampleRows);
        }

        try {
          const res = await insertBatch(opts.table, batch);
          inserted += res.inserted;
          console.log(`⬆️  Inserted ${inserted.toLocaleString()} / ${total.toLocaleString()}`);
        } catch (e) {
          console.error('❌ Batch insert error:', e.message);
        } finally {
          batch = [];
          streamPausedForInsert = false;
          parser.resume();
        }
      }
    } catch (err) {
      console.error('❌ Row error:', err.message);
    }
  });

  parser.on('end', async () => {
    try {
      if (opts.create && sampleRows.length > 0 && inserted === 0) {
        await ensureTable(opts.table, sampleRows);
      }
      if (batch.length > 0) {
        const res = await insertBatch(opts.table, batch);
        inserted += res.inserted;
      }
      console.log('✅ Import complete');
      console.log(`• Rows read: ${total.toLocaleString()}`);
      console.log(`• Rows inserted: ${inserted.toLocaleString()}`);
    } catch (err) {
      console.error('❌ Finalization error:', err.message);
      process.exitCode = 1;
    }
  });

  parser.on('error', (err) => {
    console.error('❌ Stream error:', err.message);
    process.exitCode = 1;
  });
}

main().catch((e) => {
  console.error('❌ Fatal error:', e);
  process.exit(1);
});


