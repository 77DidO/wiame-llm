# wiame-llm - Guide Claude

Serveur LLM local mutualisé exposant Qwen3-14B via vLLM et MCP.

## Architecture

```
┌────────────────────────────────────────┐
│  Docker Compose                        │
│  ┌──────────────────────────────────┐  │
│  │  vLLM (port 8000)                │  │
│  │  Qwen3-14B-AWQ (~8GB VRAM)       │  │
│  │  API OpenAI: /v1/chat/completions│  │
│  └──────────────────────────────────┘  │
│                 │                      │
│  ┌──────────────┴───────────────────┐  │
│  │  MCP Server (port 3100)          │  │
│  │  Tools: chat, complete,          │  │
│  │         summarize, rag_query     │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

## Commandes

```bash
# Démarrer les services
docker compose up -d

# Logs vLLM (chargement modèle ~2-3 min)
docker logs -f wiame-vllm

# Logs MCP
docker logs -f wiame-mcp

# Arrêter
docker compose down

# Rebuild MCP server après modif
docker compose build mcp-server && docker compose up -d mcp-server
```

## Configuration

```env
# .env (copier depuis .env.example)
HF_TOKEN=hf_xxxx           # Token Hugging Face (requis)
```

## Fichiers clés

```
wiame-llm/
├── docker-compose.yml          # Orchestration vLLM + MCP
├── .env                        # Variables (HF_TOKEN)
├── mcp-server/
│   ├── src/index.ts            # Serveur MCP (5 tools)
│   ├── package.json            # Dépendances Node
│   └── Dockerfile              # Build multi-stage
└── models/                     # Modèles locaux (optionnel)
```

## API vLLM

```bash
# Test API
curl http://localhost:8000/v1/models

# Chat completion
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3",
    "messages": [{"role": "user", "content": "Bonjour"}]
  }'
```

## Tools MCP

| Tool | Description | Paramètres |
|------|-------------|------------|
| `chat` | Chat avec historique | `messages[]`, `temperature`, `max_tokens` |
| `complete` | Complétion simple | `prompt`, `temperature`, `max_tokens` |
| `summarize` | Résumé FR (CR réunions) | `text`, `style` (brief/detailed/bullet-points) |
| `rag_query` | Q&A sur contexte | `question`, `context`, `language` |
| `health` | État du serveur | - |

## Intégration clients

### WIAME CR (backend)
```typescript
// backend/.env
OPENAI_BASE_URL=http://localhost:8000/v1
OPENAI_API_KEY=not-needed
OPENAI_MODEL=qwen3
```

### WiameRag (LangChain)
```python
from langchain_openai import ChatOpenAI
llm = ChatOpenAI(
    base_url="http://localhost:8000/v1",
    api_key="not-needed",
    model="qwen3"
)
```

### Claude Code (MCP)
```json
// ~/.claude/claude_desktop_config.json
{
  "mcpServers": {
    "wiame-llm": {
      "command": "node",
      "args": ["c:/Projets/wiame-llm/mcp-server/dist/index.js"],
      "env": {
        "VLLM_BASE_URL": "http://localhost:8000/v1"
      }
    }
  }
}
```

## Ressources GPU

| Composant | VRAM |
|-----------|------|
| Qwen3-14B AWQ | ~8GB |
| Contexte 32k | ~2GB |
| **Total** | **~10GB** |
| Marge RTX Pro 5000 | ~38GB |

## Dépannage

```bash
# vLLM ne démarre pas
docker logs wiame-vllm | tail -50

# Vérifier GPU
docker exec wiame-vllm nvidia-smi

# MCP ne répond pas
curl http://localhost:8000/health

# Reconstruire tout
docker compose down && docker compose build --no-cache && docker compose up -d
```

## Évolutions possibles

- Ajouter Qwen3-Coder-14B (swap modèle)
- Embeddings locaux (BGE-M3)
- Cache Redis pour réponses fréquentes

---
**Version:** 1.0.0 | **Modèle:** Qwen3-14B-AWQ | **VRAM:** ~10GB
