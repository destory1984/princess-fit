import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const schema = readFileSync('supabase/schema.sql', 'utf8');
const migrate = readFileSync('supabase/migrate.sql', 'utf8');
const db = readFileSync('lib/db.ts', 'utf8');

/** Columns per table, from CREATE TABLE and ALTER TABLE ADD COLUMN. */
function columns(sql: string) {
  const tables = new Map<string, Set<string>>();
  for (const m of sql.matchAll(/create table if not exists (\w+) \(([\s\S]*?)\n\);/g)) {
    const cols = new Set<string>();
    for (const line of m[2].split('\n')) {
      const name = line.trim().match(/^(\w+)\s/)?.[1];
      if (name && !['unique', 'primary', 'references', 'constraint', 'foreign'].includes(name)) {
        cols.add(name);
      }
    }
    tables.set(m[1], cols);
  }
  for (const m of sql.matchAll(/alter table (\w+) add column if not exists (\w+)/g)) {
    if (!tables.has(m[1])) tables.set(m[1], new Set());
    tables.get(m[1])!.add(m[2]);
  }
  return tables;
}

const declared = columns(schema);

/**
 * getExerciseUsage once ordered workout_sets by created_at, a column that
 * table has never had. Nothing caught it: the query only runs against a real
 * database, and the screen renders an empty list when it throws. This reads
 * the queries and holds them to the schema.
 */
test('every column a query names exists in the schema', () => {
  const chunks = db.split(/\.from\('(\w+)'\)/);
  const problems: string[] = [];

  for (let i = 1; i < chunks.length; i += 2) {
    const table = chunks[i];
    const body = chunks[i + 1].slice(0, 1200);
    const known = declared.get(table);
    if (!known) {
      problems.push(`unknown table ${table}`);
      continue;
    }

    const used = new Set<string>();
    const select = body.match(/\.select\(\s*'([^']*)'/)?.[1];
    if (select) {
      // Drop embedded resources like `workouts!inner(started_at)`.
      for (const part of select.replace(/\w+!?\w*\([^)]*\)/g, '').split(',')) {
        const name = part.trim();
        if (name && name !== '*') used.add(name);
      }
    }
    for (const m of body.matchAll(/\.(?:eq|neq|gte|lte|gt|lt|order|not)\(\s*'([\w.]+)'/g)) {
      if (!m[1].includes('.')) used.add(m[1]);
    }
    const payloads = [
      ...body.matchAll(/\.(?:insert|upsert|update)\(\s*(\{[\s\S]*?\})[,)]/g),
    ];
    {
      for (const m of payloads) {
        for (const k of m[1].matchAll(/(?:^|[{,\s])(\w+)\s*:/g)) used.add(k[1]);
        for (const k of m[1].matchAll(/\.\.\.\(\w+\.(\w+)\s*\?/g)) used.add(k[1]);
      }
    }

    for (const column of used) {
      if (column !== 'onConflict' && !known.has(column)) {
        problems.push(`${table}.${column}`);
      }
    }
  }

  assert.deepEqual(problems, []);
});

// A column added to schema.sql but not to migrate.sql works on a fresh
// database and fails on every existing one.
test('every column the schema adds is in the migration too', () => {
  const migrated = columns(migrate);
  const missing: string[] = [];

  for (const m of schema.matchAll(/alter table (\w+) add column if not exists (\w+)/g)) {
    if (!migrated.get(m[1])?.has(m[2])) missing.push(`${m[1]}.${m[2]}`);
  }
  for (const [table] of declared) {
    // Tables that shipped after the first release need to be in the migration.
    if (table === 'body_logs' && !migrate.includes('create table if not exists body_logs')) {
      missing.push(table);
    }
  }

  assert.deepEqual(missing, []);
});
