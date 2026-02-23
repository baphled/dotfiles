/**
 * MCP Server for Memory (mem0-compatible) using official SDK
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import the backend  
import { Mem0Backend } from './mcp-mem0-server.js';

const backend = new Mem0Backend();

// Create server
const server = new Server(
  {
    name: 'mem0-memory',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
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
            query: { type: 'string', description: 'Search query to find relevant memories' },
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
        inputSchema: { type: 'object', properties: {} },
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
                  observations: { type: 'array', items: { type: 'string' } },
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
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'create_entities': {
        const entities = args.entities;
        await backend.createEntities(entities);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, created: entities.length })}] };
      }
      case 'add_observations': {
        const observations = args.observations;
        for (const obs of observations) {
          await backend.addObservations(obs.entityName, obs.contents);
        }
        return { content: [{ type: 'text', text: JSON.stringify({ success: true })}] };
      }
      case 'create_relations': {
        const relations = args.relations;
        await backend.createRelations(relations);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true })}] };
      }
      case 'search_nodes': {
        const results = await backend.search(args.query);
        return { content: [{ type: 'text', text: JSON.stringify(results)}] };
      }
      case 'open_nodes': {
        const results = await backend.openNodes(args.names);
        return { content: [{ type: 'text', text: JSON.stringify(results)}] };
      }
      case 'read_graph': {
        const graph = await backend.readGraph();
        return { content: [{ type: 'text', text: JSON.stringify(graph)}] };
      }
      case 'delete_entities': {
        await backend.deleteEntities(args.entityNames);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true })}] };
      }
      case 'delete_observations': {
        for (const del of args.deletions) {
          await backend.deleteObservations(del.entityName, del.observations);
        }
        return { content: [{ type: 'text', text: JSON.stringify({ success: true })}] };
      }
      case 'delete_relations': {
        await backend.deleteRelations(args.relations);
        return { content: [{ type: 'text', text: JSON.stringify({ success: true })}] };
      }
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

// Use connect method instead of run
const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
