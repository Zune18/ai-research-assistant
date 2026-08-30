# Local Setup Guide

## Change Pinecone Index Dimension

Delete the existing index (using the command below), then run `client.test.ts` (`./src/db/pinecone/client.test.ts`):

```bash
npx tsx -e "import { pinecone } from './src/db/pinecone/client'; import { env } from './src/config/env'; (async () => { await pinecone.deleteIndex(env.PINECONE_INDEX_NAME); console.log('Deleted old index:', env.PINECONE_INDEX_NAME); })();"
```

---

## Local Qwen3 Reranker Setup

1. Download the Windows x64 CUDA build of `llama.cpp` and extract to `C:\llama-cpp`.
2. Open PowerShell:
   ```powershell
   cd C:\llama-cpp
   ```
3. Check the installation:
   ```powershell
   .\llama-server.exe --version
   ```
4. Start the reranker:
   ```powershell
   .\llama-server.exe -hf ggml-org/Qwen3-reranker-0.6B-Q8_0-GGUF:Q8_0 --embedding --rerank --pooling rank --port 8080
   ```

The model (~600 MB) downloads automatically on first run and is cached locally.

**API endpoint:** `http://127.0.0.1:8080/v1/rerank`

Replace the OpenRouter request in your Node.js code with:

```js
const response = await axios.post(
  "http://127.0.0.1:8080/v1/rerank",
  {
    model: "Qwen3-reranker-0.6B",
    query,
    documents,
    top_n: documents.length,
  },
  {
    headers: {
      "Content-Type": "application/json",
    },
  }
);
```

---

## Local Qwen3 Embedding Setup

`Qwen3-Embedding-0.6B` produces 1024-dimensional embeddings.

### 1. Start the embedding server

```powershell
cd C:\llama-cpp
.\llama-server.exe -hf Qwen/Qwen3-Embedding-0.6B-GGUF:Q8_0 --embedding --pooling last --port 8081
```

The model downloads automatically on first run and is then cached.

### 2. Node.js code

Replace your OpenRouter URL with:

```js
const response = await axios.post(
  "http://127.0.0.1:8081/v1/embeddings",
  {
    model: "Qwen3-Embedding-0.6B",
    input: text,
  },
  {
    headers: {
      "Content-Type": "application/json",
    },
  }
);
```

NEED TO RUN POSTGRES DB MIGRATIONS
(SEE PART 2.1)