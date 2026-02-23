/**
 * Tests for MCP mem0 server
 * 
 * Tests the server module loads and exposes expected tool definitions/handlers.
 */

import {
  handleInitialize,
  handleToolsList,
  handleCreateEntities,
  handleAddObservations,
  handleCreateRelations,
  handleSearchNodes,
  handleOpenNodes,
  handleReadGraph,
  handleDeleteEntities,
  handleDeleteRelations,
  handleToolCall,
  memoryBackend,
  InMemoryBackend
} from '../mcp-mem0-server';

// Get direct access to the store for assertions
// This works because we are using InMemoryBackend in tests
const graphStore = (memoryBackend as InMemoryBackend)._getStore();

// Helper to capture stdout.write output (supports both sync and async functions)
async function captureStdout(fn: () => void | Promise<void>): Promise<string[]> {
  const writes: string[] = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = (chunk: string | Buffer, ...args: unknown[]) => {
    writes.push(chunk.toString());
    return true;
  };
  try {
    await fn();
  } finally {
    process.stdout.write = originalWrite;
  }
  return writes;
}

describe('MCP Mem0 Server', () => {
  // Reset graphStore before each test
  beforeEach(async () => {
    await (memoryBackend as InMemoryBackend).reset();
  });

  describe('handleInitialize', () => {
    it('should return valid initialize response', async () => {
      const logs = await captureStdout(() => handleInitialize(1));
      
      expect(logs.length).toBe(1);
      const response = JSON.parse(logs[0]);
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result.protocolVersion).toBe('2024-11-05');
      expect(response.result.serverInfo.name).toBe('mem0-memory');
      expect(response.result.serverInfo.version).toBe('1.0.0');
    });
  });

  describe('handleToolsList', () => {
    it('should return all expected memory tools with bare names', async () => {
      const logs = await captureStdout(() => handleToolsList(2));
      
      const response = JSON.parse(logs[0]);
      const toolNames = response.result.tools.map((t: { name: string }) => t.name);
      
      // Check all expected tools are present
      expect(toolNames).toContain('create_entities');
      expect(toolNames).toContain('add_observations');
      expect(toolNames).toContain('create_relations');
      expect(toolNames).toContain('search_nodes');
      expect(toolNames).toContain('open_nodes');
      expect(toolNames).toContain('read_graph');
      expect(toolNames).toContain('delete_entities');
      expect(toolNames).toContain('delete_observations');
      expect(toolNames).toContain('delete_relations');
      
      // Should have exactly 9 tools
      expect(toolNames.length).toBe(9);
    });
  });

  describe('handleCreateEntities', () => {
    it('should create entities in the graph store', async () => {
      const entities = [
        { name: 'Alice', entityType: 'person', observations: ['likes coding'] },
        { name: 'Bob', entityType: 'person', observations: [] }
      ];
      
      await captureStdout(() => handleCreateEntities(3, entities));
      
      // Check entities were created
      expect(graphStore.entities.size).toBe(2);
      expect(graphStore.entities.get('Alice')).toEqual({
        name: 'Alice',
        entityType: 'person',
        observations: ['likes coding']
      });
      expect(graphStore.entities.get('Bob')).toEqual({
        name: 'Bob',
        entityType: 'person',
        observations: []
      });
    });

    it('should be idempotent (skip existing entities)', async () => {
        const entities = [
            { name: 'Alice', entityType: 'person', observations: ['original'] }
        ];
        
        // First create
        await captureStdout(() => handleCreateEntities(3, entities));
        
        // Try to create again with different data
        const entities2 = [
            { name: 'Alice', entityType: 'robot', observations: ['changed'] },
            { name: 'Charlie', entityType: 'person', observations: [] }
        ];

        const logs = await captureStdout(() => handleCreateEntities(4, entities2));
        const result = JSON.parse(JSON.parse(logs[0]).result.content[0].text);

        // Alice should NOT change
        expect(graphStore.entities.get('Alice')).toEqual({
            name: 'Alice',
            entityType: 'person',
            observations: ['original']
        });

        // Charlie should be created
        expect(graphStore.entities.get('Charlie')).toBeDefined();

        // Result should only list newly created entities
        expect(result.entities.length).toBe(1);
        expect(result.entities[0].name).toBe('Charlie');
    });
  });

  describe('handleAddObservations', () => {
    it('should add observations to existing entity', async () => {
      // First create an entity
      graphStore.entities.set('Alice', {
        name: 'Alice',
        entityType: 'person',
        observations: ['likes coding']
      });
      
      // Add more observations
      await captureStdout(() => handleAddObservations(4, [
        { entityName: 'Alice', contents: ['lives in London', 'works as engineer'] }
      ]));
      
      const alice = graphStore.entities.get('Alice');
      expect(alice?.observations).toContain('likes coding');
      expect(alice?.observations).toContain('lives in London');
      expect(alice?.observations).toContain('works as engineer');
    });
    
    it('should return error if entity does not exist (Strict Mode)', async () => {
      const logs = await captureStdout(() => handleAddObservations(5, [
        { entityName: 'NonExistent', contents: ['some fact'] }
      ]));
      
      const response = JSON.parse(logs[0]);
      expect(response.result.isError).toBe(true);
      expect(response.result.content[0].text).toContain('Entity not found');
    });

    it('should not add duplicate observations', async () => {
        graphStore.entities.set('Alice', {
            name: 'Alice',
            entityType: 'person',
            observations: ['likes coding']
        });

        await captureStdout(() => handleAddObservations(4, [
            { entityName: 'Alice', contents: ['likes coding', 'new fact'] }
        ]));

        const alice = graphStore.entities.get('Alice');
        // 'likes coding' should appear only once
        expect(alice?.observations.filter(o => o === 'likes coding').length).toBe(1);
        expect(alice?.observations).toContain('new fact');
    });
  });

  describe('handleCreateRelations', () => {
    it('should create relations between entities', async () => {
      // Create entities first
      graphStore.entities.set('Alice', { name: 'Alice', entityType: 'person', observations: [] });
      graphStore.entities.set('Bob', { name: 'Bob', entityType: 'person', observations: [] });
      
      await captureStdout(() => handleCreateRelations(6, [
        { from: 'Alice', relationType: 'knows', to: 'Bob' }
      ]));
      
      const key = 'Alice:knows:Bob';
      expect(graphStore.relations.has(key)).toBe(true);
      expect(graphStore.relations.get(key)).toEqual({
        from: 'Alice',
        relationType: 'knows',
        to: 'Bob'
      });
    });

    it('should be idempotent (skip existing relations)', async () => {
        graphStore.entities.set('Alice', { name: 'Alice', entityType: 'person', observations: [] });
        graphStore.entities.set('Bob', { name: 'Bob', entityType: 'person', observations: [] });

        const relation = { from: 'Alice', relationType: 'knows', to: 'Bob' };
        
        // Create first time
        await captureStdout(() => handleCreateRelations(6, [relation]));
        
        // Create second time
        const logs = await captureStdout(() => handleCreateRelations(7, [relation]));
        const result = JSON.parse(JSON.parse(logs[0]).result.content[0].text);

        // Result should be empty list of created relations
        expect(result.relations.length).toBe(0);
    });
  });

  describe('handleSearchNodes', () => {
    it('should search entities by name and return connected relations', async () => {
      graphStore.entities.set('Alice', { name: 'Alice', entityType: 'person', observations: ['likes coding'] });
      graphStore.entities.set('Bob', { name: 'Bob', entityType: 'person', observations: ['lives in London'] });
      graphStore.relations.set('Alice:knows:Bob', { from: 'Alice', relationType: 'knows', to: 'Bob' });
      
      const logs = await captureStdout(() => handleSearchNodes(7, 'Alice'));
      
      const response = JSON.parse(logs[0]);
      const result = JSON.parse(response.result.content[0].text);
      
      expect(result.entities.length).toBe(1);
      expect(result.entities[0].name).toBe('Alice');
      
      // Should include the relation because Alice is in it
      expect(result.relations.length).toBe(1);
      expect(result.relations[0].relationType).toBe('knows');
    });
    
    it('should search by observation content', async () => {
      graphStore.entities.set('Alice', { name: 'Alice', entityType: 'person', observations: ['likes coding'] });
      
      const logs = await captureStdout(() => handleSearchNodes(8, 'coding'));
      
      const response = JSON.parse(logs[0]);
      const result = JSON.parse(response.result.content[0].text);
      
      expect(result.entities.length).toBe(1);
      expect(result.entities[0].name).toBe('Alice');
    });
  });

  describe('handleOpenNodes', () => {
    it('should return specific entities by name and relations between them', async () => {
      graphStore.entities.set('Alice', { name: 'Alice', entityType: 'person', observations: ['likes coding'] });
      graphStore.entities.set('Bob', { name: 'Bob', entityType: 'person', observations: [] });
      graphStore.entities.set('Charlie', { name: 'Charlie', entityType: 'person', observations: [] });
      
      graphStore.relations.set('Alice:knows:Bob', { from: 'Alice', relationType: 'knows', to: 'Bob' });
      graphStore.relations.set('Alice:knows:Charlie', { from: 'Alice', relationType: 'knows', to: 'Charlie' });
      
      // Open Alice and Bob (should not get Charlie relation)
      const logs = await captureStdout(() => handleOpenNodes(9, ['Alice', 'Bob']));
      
      const response = JSON.parse(logs[0]);
      const result = JSON.parse(response.result.content[0].text);
      
      expect(result.entities.length).toBe(2);
      
      // Should only get relation between Alice and Bob
      expect(result.relations.length).toBe(1);
      expect(result.relations[0].to).toBe('Bob');
    });
  });

  describe('handleReadGraph', () => {
    it('should return all entities and relations', async () => {
      graphStore.entities.set('Alice', { name: 'Alice', entityType: 'person', observations: [] });
      graphStore.relations.set('Alice:knows:Bob', { from: 'Alice', relationType: 'knows', to: 'Bob' });
      
      const logs = await captureStdout(() => handleReadGraph(10));
      
      const response = JSON.parse(logs[0]);
      const result = JSON.parse(response.result.content[0].text);
      
      expect(result.entities.length).toBe(1);
      expect(result.entities[0].name).toBe('Alice');
      expect(result.relations.length).toBe(1);
      expect(result.relations[0].relationType).toBe('knows');
    });
  });

  describe('handleDeleteEntities', () => {
    it('should delete specified entities and cascade to relations', async () => {
      graphStore.entities.set('Alice', { name: 'Alice', entityType: 'person', observations: [] });
      graphStore.entities.set('Bob', { name: 'Bob', entityType: 'person', observations: [] });
      
      graphStore.relations.set('Alice:knows:Bob', { from: 'Alice', relationType: 'knows', to: 'Bob' });
      graphStore.relations.set('Bob:knows:Charlie', { from: 'Bob', relationType: 'knows', to: 'Charlie' });
      
      // Delete Alice
      await captureStdout(() => handleDeleteEntities(11, ['Alice']));
      
      expect(graphStore.entities.has('Alice')).toBe(false);
      expect(graphStore.entities.has('Bob')).toBe(true);
      
      // Alice:knows:Bob should be gone
      expect(graphStore.relations.has('Alice:knows:Bob')).toBe(false);
      
      // Bob:knows:Charlie should remain
      expect(graphStore.relations.has('Bob:knows:Charlie')).toBe(true);
    });
  });

  describe('handleDeleteRelations', () => {
    it('should delete specified relations', async () => {
      graphStore.relations.set('Alice:knows:Bob', { from: 'Alice', relationType: 'knows', to: 'Bob' });
      
      await captureStdout(() => handleDeleteRelations(12, [{ from: 'Alice', relationType: 'knows', to: 'Bob' }]));
      
      expect(graphStore.relations.has('Alice:knows:Bob')).toBe(false);
    });
  });

  describe('handleToolCall', () => {
    it('should route to correct handler based on tool name', async () => {
      await captureStdout(() => handleToolCall(13, {
        name: 'create_entities',
        arguments: { entities: [{ name: 'Test', entityType: 'test', observations: [] }] }
      }));
      
      expect(graphStore.entities.has('Test')).toBe(true);
    });
    
    it('should handle unknown tool gracefully', async () => {
      const logs = await captureStdout(() => handleToolCall(14, {
        name: 'unknown_tool',
        arguments: {}
      }));
      
      const response = JSON.parse(logs[0]);
      expect(response.error.code).toBe(-32601);
      expect(response.error.message).toContain('Unknown tool');
    });
  });
});
