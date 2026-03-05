/**
 * MCP Server for Memory (mem0-compatible)
 * 
 * Provides tools for memory management backed by in-memory or Qdrant+Ollama storage.
 * 
 * Environment variables:
 * - MEM0_QDRANT_URL: Qdrant server URL (default: http://localhost:6333)
 * - MEM0_OLLAMA_URL: Ollama server URL (default: http://localhost:11434)
 * - MEM0_COLLECTION: Qdrant collection name (default: opencode_memory)
 * - MEM0_EMBEDDING_MODEL: Embedding model (default: nomic-embed-text)
 * - MEM0_ENABLED: Mem0Backend is default; set to 'false' to use InMemoryBackend
 */

// Configuration from environment
export const CONFIG = {
  qdrantUrl: process.env.MEM0_QDRANT_URL || 'http://localhost:6333',
  ollamaUrl: process.env.MEM0_OLLAMA_URL || 'http://localhost:11434',
  collection: process.env.MEM0_COLLECTION || 'opencode_memory',
  embeddingModel: process.env.MEM0_EMBEDDING_MODEL || 'nomic-embed-text',
};

import * as readline from 'readline';

// Data structures
export interface EntityData {
  name: string;
  entityType: string;
  observations: string[];
}

export interface RelationData {
  from: string;
  relationType: string;
  to: string;
}

export interface KnowledgeGraph {
  entities: EntityData[];
  relations: RelationData[];
}

// Qdrant point payload types
export interface EntityPayload {
  type: 'entity';
  name: string;
  entityType: string;
  observations: string[];
  userId: string;
}

export interface RelationPayload {
  type: 'relation';
  from: string;
  relationType: string;
  to: string;
  userId: string;
}

type PointPayload = EntityPayload | RelationPayload;

interface QdrantPoint {
  id: number;
  vector?: number[];
  payload: PointPayload;
}

interface QdrantScrollResult {
  result: {
    points: QdrantPoint[];
    next_page_offset?: number | null;
  };
}

interface QdrantSearchResult {
  result: Array<{
    id: number;
    score: number;
    payload: PointPayload;
  }>;
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

// Backend Interface (async for Qdrant/Ollama support)
export interface MemoryBackend {
  createEntities(entities: EntityData[]): Promise<EntityData[]>;
  addObservations(observations: { entityName: string; contents: string[] }[]): Promise<{ entityName: string; addedObservations: string[] }[]>;
  createRelations(relations: RelationData[]): Promise<RelationData[]>;
  searchNodes(query: string): Promise<KnowledgeGraph>;
  openNodes(names: string[]): Promise<KnowledgeGraph>;
  readGraph(): Promise<KnowledgeGraph>;
  deleteEntities(names: string[]): Promise<void>;
  deleteObservations(deletions: { entityName: string; observations: string[] }[]): Promise<void>;
  deleteRelations(relations: RelationData[]): Promise<void>;
  reset(): Promise<void>;
  _getStore(): { entities: Map<string, EntityData>; relations: Map<string, RelationData> };
}

// In-Memory Implementation
export class InMemoryBackend implements MemoryBackend {
  private entities = new Map<string, EntityData>();
  private relations = new Map<string, RelationData>();

  async createEntities(entities: EntityData[]): Promise<EntityData[]> {
    const created: EntityData[] = [];
    for (const entity of entities) {
      if (!this.entities.has(entity.name)) {
        const newEntity = {
          name: entity.name,
          entityType: entity.entityType,
          observations: entity.observations || [],
        };
        this.entities.set(entity.name, newEntity);
        created.push(newEntity);
      }
    }
    return created;
  }

  async addObservations(observations: { entityName: string; contents: string[] }[]): Promise<{ entityName: string; addedObservations: string[] }[]> {
    const results: { entityName: string; addedObservations: string[] }[] = [];
    
    for (const obs of observations) {
      const entity = this.entities.get(obs.entityName);
      if (!entity) {
        throw new Error(`Entity not found: ${obs.entityName}`);
      }
      
      const added: string[] = [];
      for (const content of obs.contents) {
        if (!entity.observations.includes(content)) {
          entity.observations.push(content);
          added.push(content);
        }
      }
      results.push({ entityName: obs.entityName, addedObservations: added });
    }
    
    return results;
  }

  async createRelations(relations: RelationData[]): Promise<RelationData[]> {
    const created: RelationData[] = [];
    for (const rel of relations) {
      const key = `${rel.from}:${rel.relationType}:${rel.to}`;
      if (!this.relations.has(key)) {
        this.relations.set(key, rel);
        created.push(rel);
      }
    }
    return created;
  }

  async searchNodes(query: string): Promise<KnowledgeGraph> {
    const queryLower = query.toLowerCase();
    
    // Search entities
    const matchingEntities = Array.from(this.entities.values()).filter(
      (e) =>
        e.name.toLowerCase().includes(queryLower) ||
        e.entityType.toLowerCase().includes(queryLower) ||
        e.observations.some((o) => o.toLowerCase().includes(queryLower))
    );
    
    // Find all relations connected to these entities
    const matchingEntityNames = new Set(matchingEntities.map(e => e.name));
    const connectedRelations = Array.from(this.relations.values()).filter(
      (r) => matchingEntityNames.has(r.from) || matchingEntityNames.has(r.to)
    );

    // Also search relations directly
    const directMatchingRelations = Array.from(this.relations.values()).filter(
      (r) =>
        r.from.toLowerCase().includes(queryLower) ||
        r.relationType.toLowerCase().includes(queryLower) ||
        r.to.toLowerCase().includes(queryLower)
    );

    // Combine relations, removing duplicates
    const allRelations = [...new Set([...connectedRelations, ...directMatchingRelations])];

    return {
      entities: matchingEntities,
      relations: allRelations
    };
  }

  async openNodes(names: string[]): Promise<KnowledgeGraph> {
    const entities = names
      .map((name) => this.entities.get(name))
      .filter((e): e is EntityData => e !== undefined);
    
    const entityNames = new Set(entities.map(e => e.name));
    
    // Find relations strictly BETWEEN these entities
    const relations = Array.from(this.relations.values()).filter(
      (r) => entityNames.has(r.from) && entityNames.has(r.to)
    );

    return {
      entities,
      relations
    };
  }

  async readGraph(): Promise<KnowledgeGraph> {
    return {
      entities: Array.from(this.entities.values()),
      relations: Array.from(this.relations.values())
    };
  }

  async deleteEntities(names: string[]): Promise<void> {
    const namesSet = new Set(names);
    
    // Delete entities
    for (const name of names) {
      this.entities.delete(name);
    }
    
    // Cascading delete: remove relations where deleted entities are involved
    for (const [key, rel] of this.relations.entries()) {
      if (namesSet.has(rel.from) || namesSet.has(rel.to)) {
        this.relations.delete(key);
      }
    }
  }

  async deleteObservations(deletions: { entityName: string; observations: string[] }[]): Promise<void> {
    for (const del of deletions) {
      const entity = this.entities.get(del.entityName);
      if (entity) {
        entity.observations = entity.observations.filter(
          (o) => !del.observations.includes(o)
        );
      }
    }
  }

  async deleteRelations(relations: RelationData[]): Promise<void> {
    for (const rel of relations) {
      const key = `${rel.from}:${rel.relationType}:${rel.to}`;
      this.relations.delete(key);
    }
  }

  async reset(): Promise<void> {
    this.entities.clear();
    this.relations.clear();
  }

  _getStore() {
    return { entities: this.entities, relations: this.relations };
  }
}

// --- Mem0 Backend Helpers ---

/** Deterministic djb2 hash producing a stable uint32 ID */
export function hashToId(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Compose searchable text for embedding */
function composeEntityText(entity: EntityData): string {
  return `${entity.name} ${entity.entityType} ${entity.observations.join(' ')}`;
}

function composeRelationText(rel: RelationData): string {
  return `${rel.from} ${rel.relationType} ${rel.to}`;
}

// Mem0 Backend Implementation (Qdrant REST + Ollama embeddings)
export class Mem0Backend implements MemoryBackend {
  private config: typeof CONFIG;
  private collectionEnsured = false;
  private readonly userId = 'opencode';

  constructor(config?: typeof CONFIG) {
    this.config = config ?? CONFIG;
  }

  /** Ensure the Qdrant collection exists (idempotent — ignores 409) */
  private async ensureCollection(): Promise<void> {
    if (this.collectionEnsured) return;

    const resp = await fetch(`${this.config.qdrantUrl}/collections/${this.config.collection}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectors: { size: 768, distance: 'Cosine' },
      }),
    });

    // 200 = created, 409 = already exists — both are fine
    if (resp.ok || resp.status === 409) {
      this.collectionEnsured = true;
      return;
    }

    throw new Error(`Failed to ensure Qdrant collection: ${resp.status} ${resp.statusText}`);
  }

  /** Get embedding vector from Ollama */
  private async embed(text: string): Promise<number[]> {
    const resp = await fetch(`${this.config.ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.embeddingModel,
        prompt: text,
      }),
    });

    if (!resp.ok) {
      throw new Error(`Ollama embedding failed: ${resp.status} ${resp.statusText}`);
    }

    const data = (await resp.json()) as OllamaEmbeddingResponse;
    return data.embedding;
  }

  /** Upsert points into Qdrant */
  private async upsertPoints(points: Array<{ id: number; vector: number[]; payload: PointPayload }>): Promise<void> {
    const resp = await fetch(`${this.config.qdrantUrl}/collections/${this.config.collection}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points }),
    });

    if (!resp.ok) {
      throw new Error(`Qdrant upsert failed: ${resp.status} ${resp.statusText}`);
    }
  }

  /** Scroll points with a filter */
  private async scrollPoints(filter: Record<string, unknown>): Promise<QdrantPoint[]> {
    const allPoints: QdrantPoint[] = [];
    let offset: number | null | undefined = undefined;

    // Paginate through all matching points
    do {
      const body: Record<string, unknown> = {
        filter,
        limit: 1000,
        with_payload: true,
        with_vector: false,
      };
      if (offset !== undefined) {
        body.offset = offset;
      }

      const resp = await fetch(`${this.config.qdrantUrl}/collections/${this.config.collection}/points/scroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        throw new Error(`Qdrant scroll failed: ${resp.status} ${resp.statusText}`);
      }

      const data = (await resp.json()) as QdrantScrollResult;
      allPoints.push(...data.result.points);
      offset = data.result.next_page_offset ?? null;
    } while (offset !== null && offset !== undefined);

    return allPoints;
  }

  /** Delete points by filter */
  private async deleteByFilter(filter: Record<string, unknown>): Promise<void> {
    const resp = await fetch(`${this.config.qdrantUrl}/collections/${this.config.collection}/points/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter }),
    });

    if (!resp.ok) {
      throw new Error(`Qdrant delete failed: ${resp.status} ${resp.statusText}`);
    }
  }

  /** Build userId filter clause */
  private userFilter(): { key: string; match: { value: string } } {
    return { key: 'userId', match: { value: this.userId } };
  }

  /** Look up a single entity by name from Qdrant */
  private async findEntity(name: string): Promise<QdrantPoint | undefined> {
    const points = await this.scrollPoints({
      must: [
        this.userFilter(),
        { key: 'type', match: { value: 'entity' } },
        { key: 'name', match: { value: name } },
      ],
    });
    return points[0];
  }

  async createEntities(entities: EntityData[]): Promise<EntityData[]> {
    await this.ensureCollection();

    const created: EntityData[] = [];

    for (const entity of entities) {
      // Check idempotency — skip if already exists
      const existing = await this.findEntity(entity.name);
      if (existing) continue;

      const observations = entity.observations || [];
      const entityData: EntityData = {
        name: entity.name,
        entityType: entity.entityType,
        observations,
      };

      const text = composeEntityText(entityData);
      const vector = await this.embed(text);

      const payload: EntityPayload = {
        type: 'entity',
        name: entity.name,
        entityType: entity.entityType,
        observations,
        userId: this.userId,
      };

      await this.upsertPoints([{
        id: hashToId(entity.name),
        vector,
        payload,
      }]);

      created.push(entityData);
    }

    return created;
  }

  async addObservations(observations: { entityName: string; contents: string[] }[]): Promise<{ entityName: string; addedObservations: string[] }[]> {
    await this.ensureCollection();

    const results: { entityName: string; addedObservations: string[] }[] = [];

    for (const obs of observations) {
      const existing = await this.findEntity(obs.entityName);
      if (!existing) {
        throw new Error(`Entity not found: ${obs.entityName}`);
      }

      const entityPayload = existing.payload as EntityPayload;
      const currentObs = entityPayload.observations || [];
      const added: string[] = [];

      for (const content of obs.contents) {
        if (!currentObs.includes(content)) {
          currentObs.push(content);
          added.push(content);
        }
      }

      if (added.length > 0) {
        // Re-embed with updated observations
        const updatedEntity: EntityData = {
          name: entityPayload.name,
          entityType: entityPayload.entityType,
          observations: currentObs,
        };
        const text = composeEntityText(updatedEntity);
        const vector = await this.embed(text);

        const updatedPayload: EntityPayload = {
          type: 'entity',
          name: entityPayload.name,
          entityType: entityPayload.entityType,
          observations: currentObs,
          userId: this.userId,
        };

        await this.upsertPoints([{
          id: hashToId(entityPayload.name),
          vector,
          payload: updatedPayload,
        }]);
      }

      results.push({ entityName: obs.entityName, addedObservations: added });
    }

    return results;
  }

  async createRelations(relations: RelationData[]): Promise<RelationData[]> {
    await this.ensureCollection();

    const created: RelationData[] = [];

    for (const rel of relations) {
      const relKey = `${rel.from}:${rel.relationType}:${rel.to}`;

      // Check idempotency
      const existingPoints = await this.scrollPoints({
        must: [
          this.userFilter(),
          { key: 'type', match: { value: 'relation' } },
          { key: 'from', match: { value: rel.from } },
          { key: 'relationType', match: { value: rel.relationType } },
          { key: 'to', match: { value: rel.to } },
        ],
      });

      if (existingPoints.length > 0) continue;

      const text = composeRelationText(rel);
      const vector = await this.embed(text);

      const payload: RelationPayload = {
        type: 'relation',
        from: rel.from,
        relationType: rel.relationType,
        to: rel.to,
        userId: this.userId,
      };

      await this.upsertPoints([{
        id: hashToId(relKey),
        vector,
        payload,
      }]);

      created.push(rel);
    }

    return created;
  }

  async searchNodes(query: string): Promise<KnowledgeGraph> {
    await this.ensureCollection();

    const vector = await this.embed(query);

    const resp = await fetch(`${this.config.qdrantUrl}/collections/${this.config.collection}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector,
        limit: 20,
        with_payload: true,
        filter: {
          must: [this.userFilter()],
        },
      }),
    });

    if (!resp.ok) {
      throw new Error(`Qdrant search failed: ${resp.status} ${resp.statusText}`);
    }

    const data = (await resp.json()) as QdrantSearchResult;

    const entities: EntityData[] = [];
    const relations: RelationData[] = [];

    for (const hit of data.result) {
      if (hit.payload.type === 'entity') {
        const p = hit.payload as EntityPayload;
        entities.push({
          name: p.name,
          entityType: p.entityType,
          observations: p.observations || [],
        });
      } else if (hit.payload.type === 'relation') {
        const p = hit.payload as RelationPayload;
        relations.push({
          from: p.from,
          relationType: p.relationType,
          to: p.to,
        });
      }
    }

    // Also find relations connected to matching entities
    const entityNames = new Set(entities.map(e => e.name));
    if (entityNames.size > 0) {
      const allRelations = await this.scrollPoints({
        must: [
          this.userFilter(),
          { key: 'type', match: { value: 'relation' } },
        ],
      });

      for (const pt of allRelations) {
        const p = pt.payload as RelationPayload;
        if (entityNames.has(p.from) || entityNames.has(p.to)) {
          const alreadyIncluded = relations.some(
            r => r.from === p.from && r.relationType === p.relationType && r.to === p.to
          );
          if (!alreadyIncluded) {
            relations.push({
              from: p.from,
              relationType: p.relationType,
              to: p.to,
            });
          }
        }
      }
    }

    return { entities, relations };
  }

  async openNodes(names: string[]): Promise<KnowledgeGraph> {
    await this.ensureCollection();

    const entities: EntityData[] = [];

    for (const name of names) {
      const pt = await this.findEntity(name);
      if (pt) {
        const p = pt.payload as EntityPayload;
        entities.push({
          name: p.name,
          entityType: p.entityType,
          observations: p.observations || [],
        });
      }
    }

    const entityNames = new Set(entities.map(e => e.name));

    // Find relations strictly BETWEEN these entities
    const allRelationPoints = await this.scrollPoints({
      must: [
        this.userFilter(),
        { key: 'type', match: { value: 'relation' } },
      ],
    });

    const relations: RelationData[] = [];
    for (const pt of allRelationPoints) {
      const p = pt.payload as RelationPayload;
      if (entityNames.has(p.from) && entityNames.has(p.to)) {
        relations.push({
          from: p.from,
          relationType: p.relationType,
          to: p.to,
        });
      }
    }

    return { entities, relations };
  }

  async readGraph(): Promise<KnowledgeGraph> {
    await this.ensureCollection();

    const allPoints = await this.scrollPoints({
      must: [this.userFilter()],
    });

    const entities: EntityData[] = [];
    const relations: RelationData[] = [];

    for (const pt of allPoints) {
      if (pt.payload.type === 'entity') {
        const p = pt.payload as EntityPayload;
        entities.push({
          name: p.name,
          entityType: p.entityType,
          observations: p.observations || [],
        });
      } else if (pt.payload.type === 'relation') {
        const p = pt.payload as RelationPayload;
        relations.push({
          from: p.from,
          relationType: p.relationType,
          to: p.to,
        });
      }
    }

    return { entities, relations };
  }

  async deleteEntities(names: string[]): Promise<void> {
    await this.ensureCollection();

    const namesSet = new Set(names);

    // Delete entity points
    for (const name of names) {
      await this.deleteByFilter({
        must: [
          this.userFilter(),
          { key: 'type', match: { value: 'entity' } },
          { key: 'name', match: { value: name } },
        ],
      });
    }

    // Cascading delete: remove relations where from or to matches
    const allRelationPoints = await this.scrollPoints({
      must: [
        this.userFilter(),
        { key: 'type', match: { value: 'relation' } },
      ],
    });

    for (const pt of allRelationPoints) {
      const p = pt.payload as RelationPayload;
      if (namesSet.has(p.from) || namesSet.has(p.to)) {
        await this.deleteByFilter({
          must: [
            this.userFilter(),
            { key: 'type', match: { value: 'relation' } },
            { key: 'from', match: { value: p.from } },
            { key: 'relationType', match: { value: p.relationType } },
            { key: 'to', match: { value: p.to } },
          ],
        });
      }
    }
  }

  async deleteObservations(deletions: { entityName: string; observations: string[] }[]): Promise<void> {
    await this.ensureCollection();

    for (const del of deletions) {
      const existing = await this.findEntity(del.entityName);
      if (!existing) continue; // Silent on missing entity

      const entityPayload = existing.payload as EntityPayload;
      const filteredObs = entityPayload.observations.filter(
        (o) => !del.observations.includes(o)
      );

      // Re-embed with updated observations
      const updatedEntity: EntityData = {
        name: entityPayload.name,
        entityType: entityPayload.entityType,
        observations: filteredObs,
      };
      const text = composeEntityText(updatedEntity);
      const vector = await this.embed(text);

      const updatedPayload: EntityPayload = {
        type: 'entity',
        name: entityPayload.name,
        entityType: entityPayload.entityType,
        observations: filteredObs,
        userId: this.userId,
      };

      await this.upsertPoints([{
        id: hashToId(entityPayload.name),
        vector,
        payload: updatedPayload,
      }]);
    }
  }

  async deleteRelations(relations: RelationData[]): Promise<void> {
    await this.ensureCollection();

    for (const rel of relations) {
      // Silent on missing — deleteByFilter won't fail if nothing matches
      await this.deleteByFilter({
        must: [
          this.userFilter(),
          { key: 'type', match: { value: 'relation' } },
          { key: 'from', match: { value: rel.from } },
          { key: 'relationType', match: { value: rel.relationType } },
          { key: 'to', match: { value: rel.to } },
        ],
      });
    }
  }

  async reset(): Promise<void> {
    await this.ensureCollection();

    // Delete all points with userId filter
    await this.deleteByFilter({
      must: [this.userFilter()],
    });
  }

  _getStore(): { entities: Map<string, EntityData>; relations: Map<string, RelationData> } {
    throw new Error('Mem0Backend does not support direct store access');
  }
}

// Global instance - Select backend based on environment
const useMem0 = process.env.MEM0_ENABLED !== 'false';

if (useMem0) {
  // Log to stderr so it doesn't interfere with JSON-RPC over stdout
  console.error(`[mcp-mem0-server] Using Mem0Backend (Qdrant: ${CONFIG.qdrantUrl})`);
} else {
  console.error('[mcp-mem0-server] Using InMemoryBackend (MEM0_ENABLED=false)');
}

const backend: MemoryBackend = useMem0 ? new Mem0Backend() : new InMemoryBackend();

// Export backend for testing and legacy graphStore access compatibility
// Note: If using Mem0Backend, _getStore() will throw, so tests relying on it must mock or use InMemoryBackend
export const graphStore = useMem0 ? undefined : (backend as InMemoryBackend)._getStore();

// Export the backend instance itself for more advanced testing if needed
export const memoryBackend = backend;

/**
 * Send a JSON-RPC message to stdout
 */
function sendMessage(msg: object): void {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

/**
 * Handle the initialize request
 */
export function handleInitialize(id: number | null): void {
  sendMessage({
    jsonrpc: '2.0',
    id,
    result: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      serverInfo: {
        name: 'mem0-memory',
        version: '1.0.0',
      },
    },
  });
}

/**
 * Handle tools/list request - return available tools
 */
export function handleToolsList(id: number | null): void {
  sendMessage({
    jsonrpc: '2.0',
    id,
    result: {
      tools: [
        {
          name: 'create_entities',
          description: 'Create multiple entities in the knowledge graph',
          inputSchema: {
            type: 'object',
            properties: {
              entities: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Entity name' },
                    entityType: { type: 'string', description: 'Entity type' },
                    observations: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Initial observations/facts about this entity',
                    },
                  },
                  required: ['name', 'entityType'],
                },
              },
            },
            required: ['entities'],
          },
        },
        {
          name: 'add_observations',
          description: 'Add new observations to existing entities',
          inputSchema: {
            type: 'object',
            properties: {
              observations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    entityName: { type: 'string', description: 'Name of entity to add observations to' },
                    contents: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Observation contents to add',
                    },
                  },
                  required: ['entityName', 'contents'],
                },
              },
            },
            required: ['observations'],
          },
        },
        {
          name: 'create_relations',
          description: 'Create relations between entities',
          inputSchema: {
            type: 'object',
            properties: {
              relations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    from: { type: 'string', description: 'Source entity name' },
                    relationType: { type: 'string', description: 'Type of relation' },
                    to: { type: 'string', description: 'Target entity name' },
                  },
                  required: ['from', 'relationType', 'to'],
                },
              },
            },
            required: ['relations'],
          },
        },
        {
          name: 'search_nodes',
          description: 'Search for nodes in the knowledge graph by query',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query to find relevant memories',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'open_nodes',
          description: 'Get details of specific entities by name',
          inputSchema: {
            type: 'object',
            properties: {
              names: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of entity names to retrieve',
              },
            },
            required: ['names'],
          },
        },
        {
          name: 'read_graph',
          description: 'Read the entire knowledge graph',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'delete_entities',
          description: 'Delete entities from the knowledge graph',
          inputSchema: {
            type: 'object',
            properties: {
              entityNames: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of entity names to delete',
              },
            },
            required: ['entityNames'],
          },
        },
        {
          name: 'delete_observations',
          description: 'Delete specific observations from entities',
          inputSchema: {
            type: 'object',
            properties: {
              deletions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    entityName: { type: 'string' },
                    observations: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                  required: ['entityName', 'observations'],
                },
              },
            },
            required: ['deletions'],
          },
        },
        {
          name: 'delete_relations',
          description: 'Delete relations from the knowledge graph',
          inputSchema: {
            type: 'object',
            properties: {
              relations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    from: { type: 'string' },
                    relationType: { type: 'string' },
                    to: { type: 'string' },
                  },
                  required: ['from', 'relationType', 'to'],
                },
              },
            },
            required: ['relations'],
          },
        },
      ],
    },
  });
}

/**
 * Handle create_entities
 */
export async function handleCreateEntities(
  id: number | null,
  entities: EntityData[]
): Promise<void> {
  try {
    const created = await backend.createEntities(entities);
    
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ entities: created }),
          },
        ],
        isError: false,
      },
    });
  } catch (error) {
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: `Error creating entities: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      },
    });
  }
}

/**
 * Handle add_observations
 */
export async function handleAddObservations(
  id: number | null,
  observations: Array<{ entityName: string; contents: string[] }>
): Promise<void> {
  try {
    const results = await backend.addObservations(observations);
    
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results),
          },
        ],
        isError: false,
      },
    });
  } catch (error) {
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: `Error adding observations: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      },
    });
  }
}

/**
 * Handle create_relations
 */
export async function handleCreateRelations(
  id: number | null,
  relations: RelationData[]
): Promise<void> {
  try {
    const created = await backend.createRelations(relations);
    
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ relations: created }),
          },
        ],
        isError: false,
      },
    });
  } catch (error) {
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: `Error creating relations: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      },
    });
  }
}

/**
 * Handle search_nodes
 */
export async function handleSearchNodes(id: number | null, query: string): Promise<void> {
  try {
    const result = await backend.searchNodes(query);
    
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
        isError: false,
      },
    });
  } catch (error) {
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: `Error searching nodes: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      },
    });
  }
}

/**
 * Handle open_nodes
 */
export async function handleOpenNodes(id: number | null, names: string[]): Promise<void> {
  try {
    const result = await backend.openNodes(names);
    
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
        isError: false,
      },
    });
  } catch (error) {
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: `Error opening nodes: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      },
    });
  }
}

/**
 * Handle read_graph
 */
export async function handleReadGraph(id: number | null): Promise<void> {
  try {
    const result = await backend.readGraph();
    
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
        isError: false,
      },
    });
  } catch (error) {
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: `Error reading graph: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      },
    });
  }
}

/**
 * Handle delete_entities
 */
export async function handleDeleteEntities(id: number | null, names: string[]): Promise<void> {
  try {
    await backend.deleteEntities(names);
    
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, message: `Deleted ${names.length} entity(s)` }),
          },
        ],
        isError: false,
      },
    });
  } catch (error) {
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: `Error deleting entities: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      },
    });
  }
}

/**
 * Handle delete_observations
 */
export async function handleDeleteObservations(
  id: number | null,
  deletions: Array<{ entityName: string; observations: string[] }>
): Promise<void> {
  try {
    await backend.deleteObservations(deletions);
    
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, message: `Deleted observations from ${deletions.length} entity(s)` }),
          },
        ],
        isError: false,
      },
    });
  } catch (error) {
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: `Error deleting observations: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      },
    });
  }
}

/**
 * Handle delete_relations
 */
export async function handleDeleteRelations(
  id: number | null,
  relations: RelationData[]
): Promise<void> {
  try {
    await backend.deleteRelations(relations);
    
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, message: `Deleted ${relations.length} relation(s)` }),
          },
        ],
        isError: false,
      },
    });
  } catch (error) {
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: `Error deleting relations: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      },
    });
  }
}

/**
 * Handle tools/call request
 */
export async function handleToolCall(
  id: number | null,
  params: { name: string; arguments?: object }
): Promise<void> {
  const { name, arguments: args = {} } = params;
  
  try {
    switch (name) {
      case 'create_entities': {
        const entities = (args as { entities?: unknown }).entities;
        await handleCreateEntities(id, entities as EntityData[]);
        break;
      }
        
      case 'add_observations': {
        const observations = (args as { observations?: unknown }).observations;
        await handleAddObservations(id, observations as Array<{ entityName: string; contents: string[] }>);
        break;
      }
        
      case 'create_relations': {
        const relations = (args as { relations?: unknown }).relations;
        await handleCreateRelations(id, relations as RelationData[]);
        break;
      }
        
      case 'search_nodes': {
        const query = (args as { query?: string }).query;
        await handleSearchNodes(id, query || '');
        break;
      }
        
      case 'open_nodes': {
        const names = (args as { names?: string[] }).names;
        await handleOpenNodes(id, names || []);
        break;
      }
        
      case 'read_graph':
        await handleReadGraph(id);
        break;
      
      case 'delete_entities': {
        const names = (args as { entityNames?: string[] }).entityNames;
        await handleDeleteEntities(id, names || []);
        break;
      }
        
      case 'delete_observations': {
        const deletions = (args as { deletions?: unknown }).deletions;
        await handleDeleteObservations(id, deletions as Array<{ entityName: string; observations: string[] }>);
        break;
      }
        
      case 'delete_relations': {
        const relations = (args as { relations?: unknown }).relations;
        await handleDeleteRelations(id, relations as RelationData[]);
        break;
      }
        
      default:
        sendMessage({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Unknown tool: ${name}` },
        });
    }
  } catch (error) {
    sendMessage({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      },
    });
  }
}

/**
 * Main MCP server loop (for running as standalone server)
 */

/**
 * Main MCP server loop (for running as standalone server)
 */
function main(): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', async (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const msg = JSON.parse(trimmed);
      const method = msg.method as string;
      const msgId = msg.id as number | null;
      const params = msg.params as object | undefined;

      switch (method) {
        case 'initialize':
          handleInitialize(msgId);
          break;

        case 'tools/list':
          handleToolsList(msgId);
          break;

        case 'tools/call':
          await handleToolCall(msgId, params as { name: string; arguments?: object });
          break;

        case 'notifications/initialized':
          break;

        default:
          sendMessage({
            jsonrpc: '2.0',
            id: msgId,
            error: { code: -32601, message: `Method not found: ${method}` },
          });
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        return;
      }
      sendMessage({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: String(error) },
      });
    }
  });
}

main();