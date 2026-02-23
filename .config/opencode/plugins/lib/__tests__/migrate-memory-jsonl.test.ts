import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  parseJsonlLine,
  parseJsonlFile,
  generateCreateEntitiesRequest,
  generateCreateRelationsRequest,
} from '../../../scripts/migrate-memory-jsonl';
import type { EntityData, RelationData } from '../mcp-mem0-server';

describe('migrate-memory-jsonl', () => {
  let tempDir: string;
  let tempFile: string;

  beforeEach(() => {
    tempDir = join(__dirname, '.temp-migrate-test');
    tempFile = join(tempDir, 'test-memory.jsonl');
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    try {
      unlinkSync(tempFile);
      unlinkSync(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('parseJsonlLine', () => {
    it('should parse a valid entity record', () => {
      const line = JSON.stringify({
        type: 'entity',
        name: 'TestEntity',
        entityType: 'Concept',
        observations: ['obs1', 'obs2'],
      });

      const result = parseJsonlLine(line, 1);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('entity');
      expect((result?.data as EntityData).name).toBe('TestEntity');
      expect((result?.data as EntityData).entityType).toBe('Concept');
      expect((result?.data as EntityData).observations).toEqual(['obs1', 'obs2']);
    });

    it('should parse a valid relation record', () => {
      const line = JSON.stringify({
        type: 'relation',
        from: 'Entity1',
        relationType: 'knows',
        to: 'Entity2',
      });

      const result = parseJsonlLine(line, 1);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('relation');
      expect((result?.data as RelationData).from).toBe('Entity1');
      expect((result?.data as RelationData).relationType).toBe('knows');
      expect((result?.data as RelationData).to).toBe('Entity2');
    });

    it('should return null for empty lines', () => {
      const result = parseJsonlLine('', 1);
      expect(result).toBeNull();
    });

    it('should return null for whitespace-only lines', () => {
      const result = parseJsonlLine('   \t  ', 1);
      expect(result).toBeNull();
    });

    it('should return null for malformed JSON', () => {
      const result = parseJsonlLine('{ invalid json }', 1);
      expect(result).toBeNull();
    });

    it('should return null for entity missing name', () => {
      const line = JSON.stringify({
        type: 'entity',
        entityType: 'Concept',
        observations: ['obs1'],
      });

      const result = parseJsonlLine(line, 1);
      expect(result).toBeNull();
    });

    it('should return null for entity missing entityType', () => {
      const line = JSON.stringify({
        type: 'entity',
        name: 'TestEntity',
        observations: ['obs1'],
      });

      const result = parseJsonlLine(line, 1);
      expect(result).toBeNull();
    });

    it('should return null for entity with non-array observations', () => {
      const line = JSON.stringify({
        type: 'entity',
        name: 'TestEntity',
        entityType: 'Concept',
        observations: 'not-an-array',
      });

      const result = parseJsonlLine(line, 1);
      expect(result).toBeNull();
    });

    it('should return null for relation missing from', () => {
      const line = JSON.stringify({
        type: 'relation',
        relationType: 'knows',
        to: 'Entity2',
      });

      const result = parseJsonlLine(line, 1);
      expect(result).toBeNull();
    });

    it('should return null for relation missing relationType', () => {
      const line = JSON.stringify({
        type: 'relation',
        from: 'Entity1',
        to: 'Entity2',
      });

      const result = parseJsonlLine(line, 1);
      expect(result).toBeNull();
    });

    it('should return null for relation missing to', () => {
      const line = JSON.stringify({
        type: 'relation',
        from: 'Entity1',
        relationType: 'knows',
      });

      const result = parseJsonlLine(line, 1);
      expect(result).toBeNull();
    });

    it('should return null for unknown type', () => {
      const line = JSON.stringify({
        type: 'unknown',
        data: 'something',
      });

      const result = parseJsonlLine(line, 1);
      expect(result).toBeNull();
    });

    it('should return null for missing type field', () => {
      const line = JSON.stringify({
        name: 'TestEntity',
        entityType: 'Concept',
      });

      const result = parseJsonlLine(line, 1);
      expect(result).toBeNull();
    });
  });

  describe('parseJsonlFile', () => {
    it('should parse a file with entities and relations', () => {
      const content = [
        JSON.stringify({
          type: 'entity',
          name: 'Alice',
          entityType: 'Person',
          observations: ['works at Acme'],
        }),
        JSON.stringify({
          type: 'entity',
          name: 'Bob',
          entityType: 'Person',
          observations: ['works at Acme'],
        }),
        JSON.stringify({
          type: 'relation',
          from: 'Alice',
          relationType: 'knows',
          to: 'Bob',
        }),
      ].join('\n');

      writeFileSync(tempFile, content);

      const result = parseJsonlFile(tempFile);

      expect(result.entities).toHaveLength(2);
      expect(result.relations).toHaveLength(1);
      expect(result.errors).toBe(0);
      expect(result.entities[0].name).toBe('Alice');
      expect(result.entities[1].name).toBe('Bob');
      expect(result.relations[0].from).toBe('Alice');
    });

    it('should skip empty lines', () => {
      const content = [
        JSON.stringify({
          type: 'entity',
          name: 'Alice',
          entityType: 'Person',
          observations: [],
        }),
        '',
        '   ',
        JSON.stringify({
          type: 'entity',
          name: 'Bob',
          entityType: 'Person',
          observations: [],
        }),
      ].join('\n');

      writeFileSync(tempFile, content);

      const result = parseJsonlFile(tempFile);

      expect(result.entities).toHaveLength(2);
      expect(result.errors).toBe(0);
    });

    it('should count malformed lines as errors', () => {
      const content = [
        JSON.stringify({
          type: 'entity',
          name: 'Alice',
          entityType: 'Person',
          observations: [],
        }),
        '{ invalid json }',
        JSON.stringify({
          type: 'entity',
          name: 'Bob',
          entityType: 'Person',
          observations: [],
        }),
      ].join('\n');

      writeFileSync(tempFile, content);

      const result = parseJsonlFile(tempFile);

      expect(result.entities).toHaveLength(2);
      expect(result.errors).toBe(1);
    });

    it('should handle empty file', () => {
      writeFileSync(tempFile, '');

      const result = parseJsonlFile(tempFile);

      expect(result.entities).toHaveLength(0);
      expect(result.relations).toHaveLength(0);
      expect(result.errors).toBe(0);
    });

    it('should handle file with only empty lines', () => {
      writeFileSync(tempFile, '\n\n   \n');

      const result = parseJsonlFile(tempFile);

      expect(result.entities).toHaveLength(0);
      expect(result.relations).toHaveLength(0);
      expect(result.errors).toBe(0);
    });
  });

  describe('generateCreateEntitiesRequest', () => {
    it('should generate valid JSON-RPC request', () => {
      const entities: EntityData[] = [
        {
          name: 'Alice',
          entityType: 'Person',
          observations: ['works at Acme'],
        },
      ];

      const request = generateCreateEntitiesRequest(entities, 1);

      expect(request.jsonrpc).toBe('2.0');
      expect(request.id).toBe(1);
      expect(request.method).toBe('tools/call');
      expect(request.params.name).toBe('create_entities');
      expect(request.params.arguments.entities).toEqual(entities);
    });

    it('should handle multiple entities', () => {
      const entities: EntityData[] = [
        {
          name: 'Alice',
          entityType: 'Person',
          observations: ['obs1'],
        },
        {
          name: 'Bob',
          entityType: 'Person',
          observations: ['obs2'],
        },
      ];

      const request = generateCreateEntitiesRequest(entities, 5);

      expect(request.id).toBe(5);
      expect(request.params.arguments.entities).toHaveLength(2);
    });

    it('should be JSON serializable', () => {
      const entities: EntityData[] = [
        {
          name: 'Alice',
          entityType: 'Person',
          observations: ['obs1'],
        },
      ];

      const request = generateCreateEntitiesRequest(entities, 1);
      const json = JSON.stringify(request);

      expect(json).toBeTruthy();
      const parsed = JSON.parse(json);
      expect(parsed.jsonrpc).toBe('2.0');
      expect(parsed.params.name).toBe('create_entities');
    });
  });

  describe('generateCreateRelationsRequest', () => {
    it('should generate valid JSON-RPC request', () => {
      const relations: RelationData[] = [
        {
          from: 'Alice',
          relationType: 'knows',
          to: 'Bob',
        },
      ];

      const request = generateCreateRelationsRequest(relations, 2);

      expect(request.jsonrpc).toBe('2.0');
      expect(request.id).toBe(2);
      expect(request.method).toBe('tools/call');
      expect(request.params.name).toBe('create_relations');
      expect(request.params.arguments.relations).toEqual(relations);
    });

    it('should handle multiple relations', () => {
      const relations: RelationData[] = [
        {
          from: 'Alice',
          relationType: 'knows',
          to: 'Bob',
        },
        {
          from: 'Bob',
          relationType: 'knows',
          to: 'Charlie',
        },
      ];

      const request = generateCreateRelationsRequest(relations, 3);

      expect(request.id).toBe(3);
      expect(request.params.arguments.relations).toHaveLength(2);
    });

    it('should be JSON serializable', () => {
      const relations: RelationData[] = [
        {
          from: 'Alice',
          relationType: 'knows',
          to: 'Bob',
        },
      ];

      const request = generateCreateRelationsRequest(relations, 2);
      const json = JSON.stringify(request);

      expect(json).toBeTruthy();
      const parsed = JSON.parse(json);
      expect(parsed.jsonrpc).toBe('2.0');
      expect(parsed.params.name).toBe('create_relations');
    });
  });

  describe('integration: full workflow', () => {
    it('should parse and generate requests for a complete JSONL file', () => {
      const content = [
        JSON.stringify({
          type: 'entity',
          name: 'Alice',
          entityType: 'Person',
          observations: ['works at Acme', 'likes coffee'],
        }),
        JSON.stringify({
          type: 'entity',
          name: 'Bob',
          entityType: 'Person',
          observations: ['works at Acme'],
        }),
        JSON.stringify({
          type: 'relation',
          from: 'Alice',
          relationType: 'knows',
          to: 'Bob',
        }),
      ].join('\n');

      writeFileSync(tempFile, content);

      const parsed = parseJsonlFile(tempFile);
      expect(parsed.entities).toHaveLength(2);
      expect(parsed.relations).toHaveLength(1);

      const entitiesReq = generateCreateEntitiesRequest(parsed.entities, 1);
      const relationsReq = generateCreateRelationsRequest(parsed.relations, 2);

      expect(entitiesReq.params.arguments.entities).toHaveLength(2);
      expect(relationsReq.params.arguments.relations).toHaveLength(1);

      // Verify both are valid JSON-RPC
      const entitiesJson = JSON.stringify(entitiesReq);
      const relationsJson = JSON.stringify(relationsReq);

      expect(() => JSON.parse(entitiesJson)).not.toThrow();
      expect(() => JSON.parse(relationsJson)).not.toThrow();
    });
  });
});
