# wiame-llm

Serveur LLM local mutualisé pour les projets Wiame, exposant Qwen3-14B via vLLM et MCP.

## Caractéristiques

| Propriété | Valeur |
|-----------|--------|
| Modèle | Qwen3-14B-AWQ |
| Quantization | AWQ 4-bit |
| VRAM | ~10GB |
| Contexte | 32k tokens |
| API | OpenAI-compatible + MCP |

## Architecture

```
┌────────────────────────────────────────┐
│  Docker: wiame-llm                     │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  vLLM Server                     │  │
│  │  Model: Qwen3-14B-AWQ            │  │
│  │  VRAM: ~8GB                      │  │
│  │  API: http://localhost:8000/v1   │  │
│  └──────────────────────────────────┘  │
│                 │                      │
│  ┌──────────────┴───────────────────┐  │
│  │  MCP Server (port 3100)          │  │
│  │  Tools: chat, complete,          │  │
│  │         summarize, rag_query     │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

## Prérequis

- Docker avec NVIDIA Container Toolkit
- GPU NVIDIA avec ~10GB VRAM disponible
- Token Hugging Face (pour télécharger le modèle)

## Installation

1. Cloner le repo et configurer l'environnement :

```bash
cd wiame-llm
cp .env.example .env
# Éditer .env avec votre HF_TOKEN
```

2. Lancer les services :

```bash
docker compose up -d
```

3. Vérifier le statut :

```bash
# Logs vLLM
docker logs -f wiame-vllm

# Test API
curl http://localhost:8000/v1/models
```

## Utilisation

### API OpenAI (pour WIAME CR, WiameRag)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="not-needed"
)

response = client.chat.completions.create(
    model="Qwen/Qwen3-14B-AWQ",
    messages=[
        {"role": "user", "content": "Résume cette réunion..."}
    ]
)
print(response.choices[0].message.content)
```

### MCP (pour VSCode / Claude Code)

Ajouter dans `~/.claude/claude_desktop_config.json` :

```json
{
  "mcpServers": {
    "wiame-llm": {
      "command": "docker",
      "args": ["exec", "-i", "wiame-mcp", "node", "dist/index.js"]
    }
  }
}
```

Ou en mode développement local :

```json
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

## Tools MCP disponibles

| Tool | Description |
|------|-------------|
| `chat` | Chat completion avec historique |
| `complete` | Complétion simple de texte |
| `summarize` | Résumé en français (brief/detailed/bullet-points) |
| `rag_query` | Réponse basée sur contexte (RAG) |
| `health` | Vérification état du serveur |

## Configuration

| Variable | Description | Défaut |
|----------|-------------|--------|
| `HF_TOKEN` | Token Hugging Face | (requis) |
| `VLLM_MODEL` | Modèle à charger | `Qwen/Qwen3-14B-AWQ` |
| `VLLM_MAX_MODEL_LEN` | Contexte max | `32768` |
| `VLLM_GPU_MEMORY_UTILIZATION` | % VRAM utilisée | `0.80` |
| `MCP_PORT` | Port serveur MCP | `3100` |

## Ressources

- VRAM utilisée : ~8GB (Qwen3-14B Q4)
- Marge restante : ~40GB pour WhisperX/PyAnnote

## Upgrade vers Qwen3-Coder-14B

Si besoin d'un modèle spécialisé code, modifier dans `docker-compose.yml` :

```yaml
command: >
  --model Qwen/Qwen3-Coder-14B-AWQ
```

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | Instructions pour Claude Code |
| [AGENTS.md](AGENTS.md) | Instructions pour agents IA |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Diagrammes et flux |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Installation serveur |
| [docs/MCP_INTEGRATION.md](docs/MCP_INTEGRATION.md) | Connexion clients MCP |

## Licence

MIT
