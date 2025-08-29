import fs from 'fs/promises';
import { SavFileReader } from 'sav-reader';
import Papa from 'papaparse';
import readline from 'readline';

/**
 * Utility helpers (normalize values into JSON-serializable JS primitives)
 */
function normalizeValueForJson(v) {
  if (v === null || v === undefined) return null;

  // JS numbers (int/float)
  if (typeof v === 'number') {
    // convert NaN -> null
    if (Number.isNaN(v)) return null;
    return v;
  }

  // BigInt -> string (JSON.stringify can't handle BigInt)
  if (typeof v === 'bigint') return v.toString();

  // Boolean / string are fine
  if (typeof v === 'boolean' || typeof v === 'string') return v;

  // Date objects -> ISO string
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    return v.toISOString();
  }

  // Arrays -> normalize each element
  if (Array.isArray(v)) return v.map(normalizeValueForJson);

  // Objects -> best-effort conversion (flatten to string)
  if (typeof v === 'object') {
    // if object has valueOf that yields primitive, use it
    try {
      const prim = v.valueOf();
      if (typeof prim !== 'object') return normalizeValueForJson(prim);
    } catch (e) {}
    return JSON.stringify(v);
  }

  // fallback to string
  return String(v);
}

function normalizeStructure(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(normalizeStructure);
  if (typeof obj === 'object') {
    const ret = {};
    for (const [k, v] of Object.entries(obj)) {
      ret[String(k)] = normalizeStructure(v);
    }
    return ret;
  }
  return normalizeValueForJson(obj);
}

/**
 * Infer dtype for a list of sample values.
 * Returns string close to pandas dtype names used in your Python mapping.
 */
function inferDtype(values) {
  // values: array (may contain nulls)
  const nonNull = values.filter((v) => v !== null && v !== undefined);

  if (nonNull.length === 0) return 'object'; // all nulls -> TEXT

  const allBool = nonNull.every((v) => typeof v === 'boolean');
  if (allBool) return 'bool';

  const allNumbers = nonNull.every((v) => typeof v === 'number' && !Number.isNaN(v));
  if (allNumbers) {
    const allInts = nonNull.every((n) => Number.isInteger(n));
    return allInts ? 'int64' : 'float64';
  }

  // Try Date detection: if values are Date objects or parseable ISO strings
  const allDates = nonNull.every((v) => {
    if (v instanceof Date) return !isNaN(v.getTime());
    if (typeof v === 'string') {
      const t = Date.parse(v);
      return !Number.isNaN(t);
    }
    return false;
  });
  if (allDates) return 'datetime64[ns]';

  // fallback to text/object (and category if unique values are small)
  return 'object';
}

/**
 * Map inferred dtype -> Postgres type (same mapping as Python)
 */
function mapDtypeToPostgres(dtypeName) {
  const dtypeMap = {
    'int64': 'BIGINT',
    'Int64': 'BIGINT',
    'int32': 'INTEGER',
    'Int32': 'INTEGER',
    'float64': 'DOUBLE PRECISION',
    'Float64': 'DOUBLE PRECISION',
    'float32': 'REAL',
    'bool': 'BOOLEAN',
    'boolean': 'BOOLEAN',
    'datetime64[ns]': 'TIMESTAMP',
    'timedelta64[ns]': 'INTERVAL',
    'object': 'TEXT',
    'string': 'TEXT',
    'category': 'TEXT'
  };
  return dtypeMap[dtypeName] || 'TEXT';
}

/**
 * Prompt user for input
 */
async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Main pipeline
 */
async function buildMetadataFromSav({
  savPath,
  csvPath = 'unemployment_dataset.csv',
  writeCsv = true,
  sampleLimitUnique = 1000 // limit for unique extraction
}) {
  // 1) open .sav (loads metadata)
  const sav = new SavFileReader(savPath);
  await sav.open();
  const meta = sav.meta; // contains sysvars, header, etc.

  // 2) read all rows (for very large files you may want to iterate using readNextRow)
  const rows = await sav.readAllRows(); // array of objects { varname: value, ... }

  // If there are no rows, return empty metadata
  if (!rows || rows.length === 0) {
    throw new Error('No rows read from SAV file.');
  }

  // 3) lowercase column names and rewrite rows with lower keys
  const originalCols = Object.keys(rows[0]);
  const lowerCols = originalCols.map((c) => c.toLowerCase());

  const rowsLower = rows.map((row) => {
    const r = {};
    for (let i = 0; i < originalCols.length; i++) {
      const orig = originalCols[i];
      const low = lowerCols[i];
      r[low] = row[orig];
    }
    return r;
  });

  // 4) optionally write CSV
  if (writeCsv) {
    const csv = Papa.unparse(rowsLower);
    await fs.writeFile(csvPath, csv, 'utf8');
  }

  // 5) save column names to file
  const columnNamesStr = lowerCols.join(',');
  await fs.writeFile('column_names.txt', columnNamesStr, 'utf8');

  // 6) infer dtypes for each column
  const columnValues = {}; // col -> values array
  for (const c of lowerCols) columnValues[c] = [];

  for (const r of rowsLower) {
    for (const c of lowerCols) {
      let v = r[c];
      columnValues[c].push(v === undefined ? null : v);
    }
  }

  const inferredDtypes = {};
  for (const c of lowerCols) {
    inferredDtypes[c] = inferDtype(columnValues[c]);
  }

  // 7) map to Postgres types (pg_map)
  const pgMap = {};
  for (const c of lowerCols) {
    pgMap[c] = mapDtypeToPostgres(inferredDtypes[c]);
  }
  console.log('pg_map:', pgMap);

  // Write dtypes string to file (comma-separated)
  const dtypesStr = lowerCols.map((c) => pgMap[c]).join(',');
  await fs.writeFile('column_dtypes_in_str.txt', dtypesStr, 'utf8');

  // 8) Build columns JSON (for RPC)
  const columns = lowerCols.map((name, idx) => ({ name, type: pgMap[name] }));
  const result = { columns };
  const jsonResultPretty = JSON.stringify(result, null, 2);
  console.log(jsonResultPretty);

  const editJson = JSON.parse(jsonResultPretty);
  editJson.if_not_exists = true;
  editJson.dest_table = 'public.dummy_table_new';
  const finalJsonToSend = editJson;

  // 9) Build data_info (min/max for numeric columns, unique list for others)
  const dataInfo = {};
  for (const c of lowerCols) {
    const vals = columnValues[c].filter((v) => v !== null && v !== undefined);
    const dtype = inferredDtypes[c];

    if (dtype === 'int64' || dtype === 'float64') {
      // compute numeric min/max
      const nums = vals.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
      if (nums.length === 0) {
        dataInfo[c] = [null, null];
      } else {
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        dataInfo[c] = [min, max];
      }
    } else {
      // categorical/text: unique values (capped)
      const uniq = [];
      const seen = new Set();
      for (const v of vals) {
        const norm = normalizeValueForJson(v);
        if (!seen.has(norm)) {
          seen.add(norm);
          uniq.push(norm);
          if (uniq.length >= sampleLimitUnique) break;
        }
      }
      dataInfo[c] = uniq;
    }
  }

  console.log('data_info sample (first 10 cols):', Object.fromEntries(Object.entries(dataInfo).slice(0, 10)));

  // 10) Prompt user for survey details
  const surveyName = await promptUser('Enter survey name: ');
  const surveyYear = await promptUser('Enter survey year: ');
  const surveySubset = await promptUser('Enter survey subset: ');

  // 11) build payload
  const payload = {
    survey_name: surveyName,
    survey_year: surveyYear,
    survey_subset: surveySubset,
    survey_column_names: lowerCols,
    survey_column_data_types: lowerCols.map((c) => inferredDtypes[c]),
    data_info: dataInfo
  };

  const payloadNorm = normalizeStructure(payload);
  const payloadJson = JSON.stringify(payloadNorm, null, 2);

  // write payload to file for convenience
  await fs.writeFile('payload.json', payloadJson, 'utf8');

  return {
    meta,
    pgMap,
    finalJsonToSend,
    dataInfo,
    payloadJson
  };
}

// run example (wrap in top-level async)
(async () => {
  try {
    const savPath = 'D:/1. Statathon 2025/Unemployment dataset/Block_1_2_Identification of sample household and particulars of field operation.sav';
    const res = await buildMetadataFromSav({ savPath, csvPath: 'unemployment_dataset.csv', writeCsv: true });
    console.log('Done. payload.json produced.');
  } catch (err) {
    console.error('Error:', err);
  }
})();
