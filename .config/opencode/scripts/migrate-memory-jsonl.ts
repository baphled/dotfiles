#!/usr/bin/env node
/**
 * Migration script: memory.jsonl → MCP mem0 server
 * 
 * Reads a JSONL file and outputs JSON-RPC requests to import entities and relations
 * into the MCP mem0 server via stdin/stdout.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-memory-jsonl.ts /path/to/memory.jsonl
 *   npx ts-node scripts/migrate-memory-jsonl.ts --dry-run /path/to/memory.jsonl
 * 
 * Output: JSON-RPC requests (one per line) to stdout
 * Logging: Progress and summary to stderr
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { EntityData, RelationData } from '../plugins/lib/mcp-mem0-server';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface ParsedRecord {
  type: 'entity' | 'relation';
  data: EntityData | RelationData;
}

/**
 * Parse a single JSONL line and validate it
 */
export function parseJsonlLine(line: string, lineNumber: number): ParsedRecord | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null; // Skip empty lines
  }

  try {
    const obj = JSON.parse(trimmed);

    if (!obj.type) {
      logError(`Line ${lineNumber}: Missing 'type' field`);
      return null;
    }

    if (obj.type === 'entity') {
      if (!obj.name || !obj.entityType || !Array.isArray(obj.observations)) {
        logError(
          `Line ${lineNumber}: Entity missing required fields (name, entityType, observations)`
        );
        return null;
      }
      return {
        type: 'entity',
        data: {
          name: obj.name,
          entityType: obj.entityType,
          observations: obj.observations,
        } as EntityData,
      };
    }

    if (obj.type === 'relation') {
      if (!obj.from || !obj.relationType || !obj.to) {
        logError(
          `Line ${lineNumber}: Relation missing required fields (from, relationType, to)`
        );
        return null;
      }
      return {
        type: 'relation',
        data: {
          from: obj.from,
          relationType: obj.relationType,
          to: obj.to,
        } as RelationData,
      };
    }

    logError(`Line ${lineNumber}: Unknown type '${obj.type}'`);
    return null;
  } catch (err) {
    logError(`Line ${lineNumber}: Malformed JSON - ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Parse JSONL file and group entities and relations
 */
export function parseJsonlFile(filePath: string): {
  entities: EntityData[];
  relations: RelationData[];
  errors: number;
} {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const entities: EntityData[] = [];
  const relations: RelationData[] = [];
  let errors = 0;

  for (let i = 0; i < lines.length; i++) {
    const record = parseJsonlLine(lines[i], i + 1);
    if (record === null) {
      if (lines[i].trim()) {
        errors++;
      }
      continue;
    }

    if (record.type === 'entity') {
      entities.push(record.data as EntityData);
    } else if (record.type === 'relation') {
      relations.push(record.data as RelationData);
    }
  }

  return { entities, relations, errors };
}

/**
 * Generate JSON-RPC request for creating entities
 */
export function generateCreateEntitiesRequest(
  entities: EntityData[],
  requestId: number
): JsonRpcRequest {
  return {
    jsonrpc: '2.0',
    id: requestId,
    method: 'tools/call',
    params: {
      name: 'create_entities',
      arguments: {
        entities,
      },
    },
  };
}

/**
 * Generate JSON-RPC request for creating relations
 */
export function generateCreateRelationsRequest(
  relations: RelationData[],
  requestId: number
): JsonRpcRequest {
  return {
    jsonrpc: '2.0',
    id: requestId,
    method: 'tools/call',
    params: {
      name: 'create_relations',
      arguments: {
        relations,
      },
    },
  };
}

/**
 * Log to stderr (doesn't interfere with stdout JSON-RPC output)
 */
function logError(msg: string): void {
  process.stderr.write(`[ERROR] ${msg}\n`);
}

function logInfo(msg: string): void {
  process.stderr.write(`[INFO] ${msg}\n`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let dryRun = false;
  let filePath: string | null = null;

  // Parse arguments
  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (!arg.startsWith('-')) {
      filePath = arg;
    }
  }

  if (!filePath) {
    logError('Usage: migrate-memory-jsonl.ts [--dry-run] <path-to-memory.jsonl>');
    process.exit(1);
  }

  const absolutePath = resolve(filePath);
  logInfo(`Reading JSONL file: ${absolutePath}`);
  logInfo(`Dry run: ${dryRun ? 'yes' : 'no'}`);

  let parsed;
  try {
    parsed = parseJsonlFile(absolutePath);
  } catch (err) {
    logError(`Failed to read file: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const { entities, relations, errors } = parsed;

  if (errors > 0) {
    logInfo(`Encountered ${errors} malformed lines (skipped)`);
  }

  logInfo(`Parsed: ${entities.length} entities, ${relations.length} relations`);

  let requestId = 1;

  // Output create_entities request
  if (entities.length > 0) {
    const req = generateCreateEntitiesRequest(entities, requestId);
    if (!dryRun) {
      process.stdout.write(JSON.stringify(req) + '\n');
    } else {
      logInfo(`[DRY-RUN] Would send create_entities request (ID ${requestId})`);
    }
    requestId++;
  }

  // Output create_relations request
  if (relations.length > 0) {
    const req = generateCreateRelationsRequest(relations, requestId);
    if (!dryRun) {
      process.stdout.write(JSON.stringify(req) + '\n');
    } else {
      logInfo(`[DRY-RUN] Would send create_relations request (ID ${requestId})`);
    }
    requestId++;
  }

  // Summary
  if (dryRun) {
    logInfo(`[DRY-RUN] Summary: Would import ${entities.length} entities and ${relations.length} relations`);
  } else {
    logInfo(`Summary: Sent ${entities.length > 0 ? 1 : 0} create_entities request(s) and ${relations.length > 0 ? 1 : 0} create_relations request(s)`);
  }
}

// Only run main if this is the entry point (not imported as a module)
// For CommonJS: require.main === module
// For ES modules: check if this file is the main entry
const isMainModule = typeof require !== 'undefined' ? require.main === module : process.argv[1]?.endsWith('migrate-memory-jsonl.ts');
if (isMainModule) {
  main().catch((err) => {
    logError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}

