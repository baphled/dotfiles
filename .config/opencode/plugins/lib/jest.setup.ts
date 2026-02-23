// Ensure tests use InMemoryBackend by default (Mem0Backend requires Qdrant + Ollama)
process.env.MEM0_ENABLED = 'false';
