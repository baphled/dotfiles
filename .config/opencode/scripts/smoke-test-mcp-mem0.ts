import { spawn, ChildProcess } from 'child_process';
import { createInterface, Interface } from 'readline';
import { resolve } from 'path';
const OPENCODE_DIR = resolve(process.cwd(), '.');
let requestCounter = 0;
let passed = 0;
let failed = 0;

function log(msg: string) { process.stderr.write(`[smoke] ${msg}\n`); }
function pass(name: string) { console.log(`✓ PASS: ${name}`); passed++; }
function fail(name: string, reason: string) { console.error(`✗ FAIL: ${name} — ${reason}`); failed++; }

// Start server
const server: ChildProcess = spawn('npx', ['ts-node', 'plugins/lib/mcp-mem0-server.ts'], {
  cwd: OPENCODE_DIR,
  stdio: ['pipe', 'pipe', 'pipe'],
});

// Line reader on stdout
const rl: Interface = createInterface({ input: server.stdout! });

// Response queue: each sendRequest pushes a resolver, each line from server resolves the oldest
const responseQueue: Array<(line: string) => void> = [];
rl.on('line', (line: string) => {
  const resolver = responseQueue.shift();
  if (resolver) resolver(line);
});

// Send request, get response
function sendRequest(method: string, params?: object): Promise<any> {
  const id = ++requestCounter;
  const request: any = { jsonrpc: '2.0', id, method };
  if (params !== undefined) request.params = params;
  
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${method}`)), 10000);
    responseQueue.push((line: string) => {
      clearTimeout(timer);
      try { resolve(JSON.parse(line)); } catch (e) { reject(e); }
    });
    server.stdin!.write(JSON.stringify(request) + '\n');
  });
}

// Fire-and-forget (no response expected)
function sendNotification(method: string, params?: object): void {
  const msg: any = { jsonrpc: '2.0', method };
  if (params !== undefined) msg.params = params;
  server.stdin!.write(JSON.stringify(msg) + '\n');
}

// Helper: extract inner JSON from tool call response
function getToolResult(response: any): any {
  return JSON.parse(response.result.content[0].text);
}

async function main() {
  // Wait for server to start
  await new Promise(r => setTimeout(r, 3000));
  log('Server started, running tests...');

  // 1. initialize
  const initResp = await sendRequest('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke-test' } });
  if (initResp.result?.protocolVersion === '2024-11-05') pass('initialize');
  else fail('initialize', `got: ${JSON.stringify(initResp.result)}`);

  sendNotification('notifications/initialized');

  // 2. tools/list
  const listResp = await sendRequest('tools/list');
  const toolCount = listResp.result?.tools?.length;
  if (toolCount === 9) pass(`tools/list (${toolCount} tools)`);
  else fail('tools/list', `expected 9 tools, got ${toolCount}`);

  // 3. create_entities
  const createResp = await sendRequest('tools/call', { name: 'create_entities', arguments: { entities: [
    { name: 'Alice', entityType: 'person', observations: ['Alice is a developer'] },
    { name: 'Bob', entityType: 'person', observations: ['Bob is a designer'] },
  ]}});
  const created = getToolResult(createResp);
  if (created.entities?.length === 2) pass('create_entities (2 entities)');
  else fail('create_entities', `expected 2, got ${JSON.stringify(created)}`);

  // 4. add_observations
  const obsResp = await sendRequest('tools/call', { name: 'add_observations', arguments: { observations: [
    { entityName: 'Alice', contents: ['Alice works at Acme Corp', 'Alice likes Go'] },
  ]}});
  const obsResult = getToolResult(obsResp);
  if (obsResult[0]?.addedObservations?.length === 2) pass('add_observations (2 added)');
  else fail('add_observations', `got: ${JSON.stringify(obsResult)}`);

  // 5. create_relations
  const relResp = await sendRequest('tools/call', { name: 'create_relations', arguments: { relations: [
    { from: 'Alice', relationType: 'knows', to: 'Bob' },
  ]}});
  const relResult = getToolResult(relResp);
  if (relResult.relations?.length === 1) pass('create_relations (1 relation)');
  else fail('create_relations', `got: ${JSON.stringify(relResult)}`);

  // 6. search_nodes
  const searchResp = await sendRequest('tools/call', { name: 'search_nodes', arguments: { query: 'Alice' }});
  const searchResult = getToolResult(searchResp);
  const foundAlice = searchResult.entities?.some((e: any) => e.name === 'Alice');
  if (foundAlice && searchResult.relations?.length >= 1) pass('search_nodes (found Alice + relations)');
  else fail('search_nodes', `got: ${JSON.stringify(searchResult)}`);

  // 7. open_nodes
  const openResp = await sendRequest('tools/call', { name: 'open_nodes', arguments: { names: ['Alice', 'Bob'] }});
  const openResult = getToolResult(openResp);
  if (openResult.entities?.length === 2 && openResult.relations?.length === 1) pass('open_nodes (2 entities, 1 relation)');
  else fail('open_nodes', `entities: ${openResult.entities?.length}, relations: ${openResult.relations?.length}`);

  // 8. read_graph
  const graphResp = await sendRequest('tools/call', { name: 'read_graph', arguments: {} });
  const graphResult = getToolResult(graphResp);
  if (graphResult.entities?.length === 2 && graphResult.relations?.length === 1) pass('read_graph (2 entities, 1 relation)');
  else fail('read_graph', `entities: ${graphResult.entities?.length}, relations: ${graphResult.relations?.length}`);

  // 9. delete_relations
  const delRelResp = await sendRequest('tools/call', { name: 'delete_relations', arguments: { relations: [
    { from: 'Alice', relationType: 'knows', to: 'Bob' },
  ]}});
  const delRelResult = getToolResult(delRelResp);
  if (delRelResult.success) pass('delete_relations');
  else fail('delete_relations', `got: ${JSON.stringify(delRelResult)}`);

  // 10. delete_observations
  const delObsResp = await sendRequest('tools/call', { name: 'delete_observations', arguments: { deletions: [
    { entityName: 'Alice', observations: ['Alice works at Acme Corp'] },
  ]}});
  const delObsResult = getToolResult(delObsResp);
  if (delObsResult.success) pass('delete_observations');
  else fail('delete_observations', `got: ${JSON.stringify(delObsResult)}`);

  // 11. delete_entities (uses entityNames key)
  const delEntResp = await sendRequest('tools/call', { name: 'delete_entities', arguments: { entityNames: ['Alice', 'Bob'] }});
  const delEntResult = getToolResult(delEntResp);
  if (delEntResult.success) pass('delete_entities');
  else fail('delete_entities', `got: ${JSON.stringify(delEntResult)}`);

  // 12. read_graph (empty)
  const emptyResp = await sendRequest('tools/call', { name: 'read_graph', arguments: {} });
  const emptyResult = getToolResult(emptyResp);
  if (emptyResult.entities?.length === 0 && emptyResult.relations?.length === 0) pass('read_graph (empty)');
  else fail('read_graph empty', `entities: ${emptyResult.entities?.length}, relations: ${emptyResult.relations?.length}`);

  // Summary
  console.log(`\n${passed}/${passed + failed} tests passed`);
  if (failed > 0) console.error(`${failed} test(s) failed`);
  
  server.kill();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  server.kill();
  process.exit(1);
});
