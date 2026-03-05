#!/usr/bin/env node
/**
 * Direct migration runner: bypasses JSON-RPC, calls Mem0Backend directly.
 * 
 * The pipe-based approach fails because stdin closes before async work completes.
 * This script imports the backend and parser directly for reliable migration.
 * 
 * Usage:
 *   npx tsx scripts/run-migration-direct.ts <path-to-memory.jsonl>
 *   npx tsx scripts/run-migration-direct.ts --dry-run <path-to-memory.jsonl>
 */

import { parseJsonlFile } from './migrate-memory-jsonl';
import { Mem0Backend } from '../plugins/lib/mcp-mem0-server';

function log(msg: string): void {
  process.stderr.write(`[migrate] ${msg}\n`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let dryRun = false;
  let filePath: string | null = null;

  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (!arg.startsWith('-')) {
      filePath = arg;
    }
  }

  if (!filePath) {
    log('Usage: run-migration-direct.ts [--dry-run] <path-to-memory.jsonl>');
    process.exit(1);
  }

  log(`Parsing JSONL: ${filePath}`);
  const { entities, relations, errors } = parseJsonlFile(filePath);

  if (errors > 0) {
    log(`Skipped ${errors} malformed lines`);
  }

  log(`Parsed: ${entities.length} entities, ${relations.length} relations`);

  if (dryRun) {
    log('[DRY-RUN] Would import the above counts. Exiting.');
    return;
  }

  const backend = new Mem0Backend();

  // Create entities in batches to show progress
  const BATCH_SIZE = 20;
  let entityCount = 0;

  for (let i = 0; i < entities.length; i += BATCH_SIZE) {
    const batch = entities.slice(i, i + BATCH_SIZE);
    const created = await backend.createEntities(batch);
    entityCount += created.length;
    log(`Entities: ${Math.min(i + BATCH_SIZE, entities.length)}/${entities.length} processed (${entityCount} new)`);
  }

  // Create relations in batches
  const REL_BATCH_SIZE = 50;
  let relationCount = 0;

  for (let i = 0; i < relations.length; i += REL_BATCH_SIZE) {
    const batch = relations.slice(i, i + REL_BATCH_SIZE);
    const created = await backend.createRelations(batch);
    relationCount += created.length;
    log(`Relations: ${Math.min(i + REL_BATCH_SIZE, relations.length)}/${relations.length} processed (${relationCount} new)`);
  }

  log(`Migration complete: ${entityCount} entities created, ${relationCount} relations created`);
  log(`Total in Qdrant should be: ${entityCount + relationCount} new + existing points`);
  process.exit(0);
}

main().catch((err) => {
  log(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  if (err instanceof Error && err.stack) {
    log(err.stack);
  }
  process.exit(1);
});