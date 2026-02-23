/**
 * Tests for Mem0Backend (Qdrant REST + Ollama embeddings)
 *
 * All network calls are mocked via global.fetch — no real Qdrant or Ollama required.
 */

import { Mem0Backend, hashToId, CONFIG } from '../mcp-mem0-server';
import type { EntityData, RelationData, EntityPayload, RelationPayload } from '../mcp-mem0-server';

// --- Test helpers ---

const FAKE_VECTOR = Array.from({ length: 768 }, (_, i) => i * 0.001);

/** Build a mock Response object */
function mockResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: () => mockResponse(body, status, statusText),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
  } as Response;
}

/** Build an Ollama embedding response */
function ollamaEmbedResponse(): Response {
  return mockResponse({ embedding: FAKE_VECTOR });
}

/** Build a Qdrant "collection created" response */
function qdrantCollectionCreated(): Response {
  return mockResponse({ result: true });
}

/** Build a Qdrant "collection already exists" 409 response */
function qdrantCollectionExists(): Response {
  return mockResponse({ status: { error: 'already exists' } }, 409, 'Conflict');
}

/** Build a Qdrant upsert success response */
function qdrantUpsertOk(): Response {
  return mockResponse({ result: { operation_id: 1, status: 'completed' } });
}

/** Build a Qdrant scroll response */
function qdrantScrollResponse(points: Array<{ id: number; payload: EntityPayload | RelationPayload }>): Response {
  return mockResponse({
    result: {
      points: points.map(p => ({ id: p.id, payload: p.payload })),
      next_page_offset: null,
    },
  });
}

/** Build a Qdrant search response */
function qdrantSearchResponse(hits: Array<{ id: number; score: number; payload: EntityPayload | RelationPayload }>): Response {
  return mockResponse({ result: hits });
}

/** Build a Qdrant delete success response */
function qdrantDeleteOk(): Response {
  return mockResponse({ result: { operation_id: 1, status: 'completed' } });
}

/** Build an entity payload */
function entityPayload(name: string, entityType: string, observations: string[]): EntityPayload {
  return { type: 'entity', name, entityType, observations, userId: 'opencode' };
}

/** Build a relation payload */
function relationPayload(from: string, relationType: string, to: string): RelationPayload {
  return { type: 'relation', from, relationType, to, userId: 'opencode' };
}

// --- Test suite ---

describe('Mem0Backend', () => {
  let backend: Mem0Backend;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    backend = new Mem0Backend({
      qdrantUrl: 'http://localhost:6333',
      ollamaUrl: 'http://localhost:11434',
      collection: 'opencode_memory',
      embeddingModel: 'nomic-embed-text',
    });

    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('hashToId', () => {
    it('produces deterministic uint32 IDs', () => {
      const id1 = hashToId('Alice');
      const id2 = hashToId('Alice');
      expect(id1).toBe(id2);
      expect(id1).toBeGreaterThan(0);
      expect(id1).toBeLessThan(2 ** 32);
    });

    it('produces different IDs for different inputs', () => {
      expect(hashToId('Alice')).not.toBe(hashToId('Bob'));
    });
  });

  describe('ensureCollection (auto-create)', () => {
    it('creates collection on first createEntities call', async () => {
      fetchMock
        // 1. PUT /collections/opencode_memory — create collection
        .mockResolvedValueOnce(qdrantCollectionCreated())
        // 2. POST scroll — check if entity exists (idempotency)
        .mockResolvedValueOnce(qdrantScrollResponse([]))
        // 3. POST Ollama embedding
        .mockResolvedValueOnce(ollamaEmbedResponse())
        // 4. PUT upsert point
        .mockResolvedValueOnce(qdrantUpsertOk());

      await backend.createEntities([
        { name: 'Alice', entityType: 'person', observations: ['likes coding'] },
      ]);

      // First call should be PUT to create collection
      expect(fetchMock.mock.calls[0][0]).toContain('/collections/opencode_memory');
      expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
    });

    it('handles 409 (collection already exists) gracefully', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionExists())
        .mockResolvedValueOnce(qdrantScrollResponse([]))
        .mockResolvedValueOnce(ollamaEmbedResponse())
        .mockResolvedValueOnce(qdrantUpsertOk());

      // Should not throw
      const created = await backend.createEntities([
        { name: 'Alice', entityType: 'person', observations: [] },
      ]);

      expect(created).toHaveLength(1);
    });
  });

  describe('createEntities', () => {
    it('creates entities with embedding and upsert', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionCreated())
        // Scroll check for Alice
        .mockResolvedValueOnce(qdrantScrollResponse([]))
        // Embed Alice
        .mockResolvedValueOnce(ollamaEmbedResponse())
        // Upsert Alice
        .mockResolvedValueOnce(qdrantUpsertOk())
        // Scroll check for Bob
        .mockResolvedValueOnce(qdrantScrollResponse([]))
        // Embed Bob
        .mockResolvedValueOnce(ollamaEmbedResponse())
        // Upsert Bob
        .mockResolvedValueOnce(qdrantUpsertOk());

      const created = await backend.createEntities([
        { name: 'Alice', entityType: 'person', observations: ['likes coding'] },
        { name: 'Bob', entityType: 'person', observations: [] },
      ]);

      expect(created).toHaveLength(2);
      expect(created[0].name).toBe('Alice');
      expect(created[1].name).toBe('Bob');
    });

    it('is idempotent — skips existing entities', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionCreated())
        // Scroll check for Alice — already exists
        .mockResolvedValueOnce(qdrantScrollResponse([
          { id: hashToId('Alice'), payload: entityPayload('Alice', 'person', ['original']) },
        ]))
        // Scroll check for Charlie — does not exist
        .mockResolvedValueOnce(qdrantScrollResponse([]))
        // Embed Charlie
        .mockResolvedValueOnce(ollamaEmbedResponse())
        // Upsert Charlie
        .mockResolvedValueOnce(qdrantUpsertOk());

      const created = await backend.createEntities([
        { name: 'Alice', entityType: 'robot', observations: ['changed'] },
        { name: 'Charlie', entityType: 'person', observations: [] },
      ]);

      // Only Charlie should be created
      expect(created).toHaveLength(1);
      expect(created[0].name).toBe('Charlie');
    });
  });

  describe('addObservations', () => {
    it('throws when entity not found', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionCreated())
        // Scroll for entity — not found
        .mockResolvedValueOnce(qdrantScrollResponse([]));

      await expect(
        backend.addObservations([{ entityName: 'Ghost', contents: ['boo'] }])
      ).rejects.toThrow('Entity not found: Ghost');
    });

    it('adds new observations and re-embeds', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionCreated())
        // Find entity
        .mockResolvedValueOnce(qdrantScrollResponse([
          { id: hashToId('Alice'), payload: entityPayload('Alice', 'person', ['likes coding']) },
        ]))
        // Embed updated entity
        .mockResolvedValueOnce(ollamaEmbedResponse())
        // Upsert updated entity
        .mockResolvedValueOnce(qdrantUpsertOk());

      const results = await backend.addObservations([
        { entityName: 'Alice', contents: ['lives in London'] },
      ]);

      expect(results).toHaveLength(1);
      expect(results[0].addedObservations).toEqual(['lives in London']);
    });

    it('skips duplicate observations', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionCreated())
        // Find entity with existing observation
        .mockResolvedValueOnce(qdrantScrollResponse([
          { id: hashToId('Alice'), payload: entityPayload('Alice', 'person', ['likes coding']) },
        ]));
      // No embed/upsert needed because no new observations

      const results = await backend.addObservations([
        { entityName: 'Alice', contents: ['likes coding'] },
      ]);

      expect(results[0].addedObservations).toEqual([]);
    });
  });

  describe('createRelations', () => {
    it('creates relations with embedding and upsert', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionCreated())
        // Scroll check — relation does not exist
        .mockResolvedValueOnce(qdrantScrollResponse([]))
        // Embed relation
        .mockResolvedValueOnce(ollamaEmbedResponse())
        // Upsert relation
        .mockResolvedValueOnce(qdrantUpsertOk());

      const created = await backend.createRelations([
        { from: 'Alice', relationType: 'knows', to: 'Bob' },
      ]);

      expect(created).toHaveLength(1);
      expect(created[0]).toEqual({ from: 'Alice', relationType: 'knows', to: 'Bob' });
    });

    it('is idempotent — skips existing relations', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionCreated())
        // Scroll check — relation already exists
        .mockResolvedValueOnce(qdrantScrollResponse([
          { id: hashToId('Alice:knows:Bob'), payload: relationPayload('Alice', 'knows', 'Bob') },
        ]));

      const created = await backend.createRelations([
        { from: 'Alice', relationType: 'knows', to: 'Bob' },
      ]);

      expect(created).toHaveLength(0);
    });
  });

  describe('searchNodes', () => {
    it('returns entities and connected relations from vector search', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionCreated())
        // Embed query
        .mockResolvedValueOnce(ollamaEmbedResponse())
        // Search — returns Alice entity
        .mockResolvedValueOnce(qdrantSearchResponse([
          { id: hashToId('Alice'), score: 0.95, payload: entityPayload('Alice', 'person', ['likes coding']) },
        ]))
        // Scroll for connected relations
        .mockResolvedValueOnce(qdrantScrollResponse([
          { id: hashToId('Alice:knows:Bob'), payload: relationPayload('Alice', 'knows', 'Bob') },
        ]));

      const result = await backend.searchNodes('Alice coding');

      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('Alice');
      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].relationType).toBe('knows');
    });
  });

  describe('openNodes', () => {
    it('returns only relations strictly between named entities', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionCreated())
        // Find Alice
        .mockResolvedValueOnce(qdrantScrollResponse([
          { id: hashToId('Alice'), payload: entityPayload('Alice', 'person', ['likes coding']) },
        ]))
        // Find Bob
        .mockResolvedValueOnce(qdrantScrollResponse([
          { id: hashToId('Bob'), payload: entityPayload('Bob', 'person', []) },
        ]))
        // Scroll all relations
        .mockResolvedValueOnce(qdrantScrollResponse([
          { id: hashToId('Alice:knows:Bob'), payload: relationPayload('Alice', 'knows', 'Bob') },
          { id: hashToId('Alice:knows:Charlie'), payload: relationPayload('Alice', 'knows', 'Charlie') },
        ]));

      const result = await backend.openNodes(['Alice', 'Bob']);

      expect(result.entities).toHaveLength(2);
      // Only Alice:knows:Bob should be included (not Alice:knows:Charlie)
      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].to).toBe('Bob');
    });
  });

  describe('readGraph', () => {
    it('returns all entities and relations', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionCreated())
        // Scroll all points
        .mockResolvedValueOnce(qdrantScrollResponse([
          { id: hashToId('Alice'), payload: entityPayload('Alice', 'person', ['likes coding']) },
          { id: hashToId('Bob'), payload: entityPayload('Bob', 'person', []) },
          { id: hashToId('Alice:knows:Bob'), payload: relationPayload('Alice', 'knows', 'Bob') },
        ]));

      const result = await backend.readGraph();

      expect(result.entities).toHaveLength(2);
      expect(result.entities[0].name).toBe('Alice');
      expect(result.entities[1].name).toBe('Bob');
      expect(result.relations).toHaveLength(1);
      expect(result.relations[0].relationType).toBe('knows');
    });
  });

  describe('deleteEntities', () => {
    it('deletes entity and cascades to connected relations', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionCreated())
        // Delete entity point for Alice
        .mockResolvedValueOnce(qdrantDeleteOk())
        // Scroll all relations to find cascading deletes
        .mockResolvedValueOnce(qdrantScrollResponse([
          { id: hashToId('Alice:knows:Bob'), payload: relationPayload('Alice', 'knows', 'Bob') },
          { id: hashToId('Bob:knows:Charlie'), payload: relationPayload('Bob', 'knows', 'Charlie') },
        ]))
        // Delete Alice:knows:Bob (cascading)
        .mockResolvedValueOnce(qdrantDeleteOk());
      // Bob:knows:Charlie is NOT deleted because it doesn't involve Alice

      await backend.deleteEntities(['Alice']);

      // Verify delete calls
      // Call 1: ensureCollection
      // Call 2: delete entity filter for Alice
      const deleteEntityCall = fetchMock.mock.calls[1];
      expect(deleteEntityCall[0]).toContain('/points/delete');
      const deleteEntityBody = JSON.parse(deleteEntityCall[1].body);
      expect(deleteEntityBody.filter.must).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'name', match: { value: 'Alice' } }),
        ])
      );

      // Call 3: scroll relations
      // Call 4: cascading delete of Alice:knows:Bob
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
  });

  describe('deleteObservations', () => {
    it('silently succeeds when entity is missing', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionCreated())
        // Find entity — not found
        .mockResolvedValueOnce(qdrantScrollResponse([]));

      // Should not throw
      await backend.deleteObservations([
        { entityName: 'Ghost', observations: ['something'] },
      ]);
    });

    it('removes observations and re-embeds when entity exists', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionCreated())
        // Find entity
        .mockResolvedValueOnce(qdrantScrollResponse([
          { id: hashToId('Alice'), payload: entityPayload('Alice', 'person', ['likes coding', 'lives in London']) },
        ]))
        // Re-embed
        .mockResolvedValueOnce(ollamaEmbedResponse())
        // Upsert updated
        .mockResolvedValueOnce(qdrantUpsertOk());

      await backend.deleteObservations([
        { entityName: 'Alice', observations: ['likes coding'] },
      ]);

      // Check the upsert was called with filtered observations
      const upsertCall = fetchMock.mock.calls[3];
      const upsertBody = JSON.parse(upsertCall[1].body);
      expect(upsertBody.points[0].payload.observations).toEqual(['lives in London']);
    });
  });

  describe('deleteRelations', () => {
    it('silently succeeds when relation is missing', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionCreated())
        // Delete by filter — succeeds even if no match
        .mockResolvedValueOnce(qdrantDeleteOk());

      // Should not throw
      await backend.deleteRelations([
        { from: 'Ghost', relationType: 'haunts', to: 'House' },
      ]);
    });

    it('deletes specified relations', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionCreated())
        .mockResolvedValueOnce(qdrantDeleteOk());

      await backend.deleteRelations([
        { from: 'Alice', relationType: 'knows', to: 'Bob' },
      ]);

      const deleteCall = fetchMock.mock.calls[1];
      expect(deleteCall[0]).toContain('/points/delete');
      const body = JSON.parse(deleteCall[1].body);
      expect(body.filter.must).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'from', match: { value: 'Alice' } }),
          expect.objectContaining({ key: 'relationType', match: { value: 'knows' } }),
          expect.objectContaining({ key: 'to', match: { value: 'Bob' } }),
        ])
      );
    });
  });

  describe('reset', () => {
    it('deletes all points with userId filter', async () => {
      fetchMock
        .mockResolvedValueOnce(qdrantCollectionCreated())
        .mockResolvedValueOnce(qdrantDeleteOk());

      await backend.reset();

      const deleteCall = fetchMock.mock.calls[1];
      expect(deleteCall[0]).toContain('/points/delete');
      const body = JSON.parse(deleteCall[1].body);
      expect(body.filter.must).toEqual([
        { key: 'userId', match: { value: 'opencode' } },
      ]);
    });
  });

  describe('_getStore', () => {
    it('throws — Mem0Backend does not support direct store access', () => {
      expect(() => backend._getStore()).toThrow('Mem0Backend does not support direct store access');
    });
  });
});
