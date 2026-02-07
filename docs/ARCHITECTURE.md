# Architecture wiame-llm

## Vue d'ensemble

wiame-llm est un serveur LLM local mutualisé qui expose Qwen3-14B via deux interfaces :
1. **API OpenAI** (vLLM) - Pour les applications (WIAME CR, WiameRag)
2. **MCP** (Model Context Protocol) - Pour les IDE (VSCode, Claude Code)

## Diagramme

```
┌─────────────────────────────────────────────────────────────┐
│                    Serveur Ubuntu                           │
│                    RTX Pro 5000 (48GB VRAM)                 │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Docker Compose: wiame-llm                             │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  vLLM Server (container: wiame-vllm)             │  │ │
│  │  │  - Image: vllm/vllm-openai:latest                │  │ │
│  │  │  - Model: Qwen/Qwen3-14B-AWQ                     │  │ │
│  │  │  - Port: 8000                                    │  │ │
│  │  │  - VRAM: ~10GB                                   │  │ │
│  │  │  - API: OpenAI-compatible                        │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                         │                              │ │
│  │                         │ HTTP internal                │ │
│  │                         ▼                              │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  MCP Server (container: wiame-mcp)               │  │ │
│  │  │  - Runtime: Node.js 22                           │  │ │
│  │  │  - Port: 3100 (stdio pour MCP)                   │  │ │
│  │  │  - SDK: @modelcontextprotocol/sdk                │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  Autres services GPU:                                       │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ WhisperX (~10GB)│  │ PyAnnote (~8GB) │                  │
│  │ (WIAME CR)      │  │ (WIAME CR)      │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         │ :8000              │ :3100              │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   WIAME CR      │  │   WiameRag      │  │  VSCode/Claude  │
│   (Node.js)     │  │   (Python)      │  │  (MCP Client)   │
│                 │  │                 │  │                 │
│ OpenAI SDK      │  │ LangChain       │  │ MCP Protocol    │
│ /v1/chat        │  │ /v1/chat        │  │ stdio/SSE       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Flux de données

### 1. Requête API (WIAME CR / WiameRag)

```
Client → HTTP POST /v1/chat/completions → vLLM → GPU → Response
```

### 2. Requête MCP (VSCode / Claude Code)

```
Client → MCP stdio → MCP Server → HTTP → vLLM → GPU → Response → MCP → Client
```

## Composants

### vLLM Server

| Propriété | Valeur |
|-----------|--------|
| Image | `vllm/vllm-openai:latest` |
| Port | 8000 |
| GPU | NVIDIA (via Docker runtime) |
| Modèle | Qwen/Qwen3-14B-AWQ |
| Quantization | AWQ (4-bit) |
| Contexte max | 32768 tokens |
| VRAM | ~10GB |

**Endpoints:**
- `GET /health` - Healthcheck
- `GET /v1/models` - Liste modèles
- `POST /v1/chat/completions` - Chat completion
- `POST /v1/completions` - Text completion

### MCP Server

| Propriété | Valeur |
|-----------|--------|
| Runtime | Node.js 22 |
| Framework | @modelcontextprotocol/sdk 1.26.0 |
| Transport | stdio (pour Claude Code) |
| Port | 3100 (si HTTP) |

**Tools exposés:**
- `chat` - Chat avec historique de messages
- `complete` - Complétion de texte simple
- `summarize` - Résumé en français (styles: brief/detailed/bullet-points)
- `rag_query` - Q&A basé sur contexte (RAG)
- `health` - Vérification état serveur

## Sécurité

- **Réseau interne** : vLLM n'est pas exposé sur Internet
- **Pas d'authentification** : Réseau local uniquement
- **CORS** : Non configuré (API interne)

## Scaling futur

1. **Multi-modèles** : vLLM supporte le chargement dynamique
2. **Load balancing** : Plusieurs instances vLLM
3. **Cache** : Redis pour réponses fréquentes
4. **Embeddings** : Ajouter BGE-M3 pour RAG local
