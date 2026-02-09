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
| Served model name | `qwen3` |

## Architecture

```
┌────────────────────────────────────────┐
│  Docker: wiame-llm                     │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  vLLM Server                     │  │
│  │  Model: Qwen3-14B-AWQ            │  │
│  │  Served as: qwen3                │  │
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
    model="qwen3",
    messages=[
        {"role": "user", "content": "Résume cette réunion..."}
    ]
)
print(response.choices[0].message.content)
```

### MCP (pour VSCode / Claude Code)

Le serveur MCP utilise le transport **SSE** (Server-Sent Events) sur le port 3100.

Ajouter dans les settings MCP de Claude Code :

```json
{
  "mcpServers": {
    "wiame-llm": {
      "url": "http://localhost:3100/sse"
    }
  }
}
```

En Docker sur le même réseau `wiame-net`, utiliser `http://wiame-mcp:3100/sse`.

## Tools MCP disponibles

| Tool | Description |
|------|-------------|
| `chat` | Chat completion avec historique |
| `complete` | Complétion simple de texte |
| `summarize` | Résumé en français (brief/detailed/bullet-points) |
| `rag_query` | Réponse basée sur contexte (RAG) |
| `health` | Vérification état du serveur |

## Réseau Docker partagé

wiame-llm utilise un réseau Docker externe `wiame-net` pour permettre aux autres projets (RAGWiame, WIAME CR) de communiquer avec le serveur vLLM.

**Créer le réseau (une seule fois)** :

```bash
docker network create wiame-net
```

Les autres projets doivent aussi déclarer ce réseau dans leur `docker-compose.yml` :

```yaml
networks:
  wiame-net:
    external: true
```

Puis accéder au vLLM via `http://wiame-vllm:8000/v1` (nom du container).

## Paramètres de sampling recommandés (Qwen3)

Les clients doivent respecter les recommandations officielles Qwen3 :

| Mode | temperature | top_p | top_k | presence_penalty |
|------|------------|-------|-------|-----------------|
| Thinking ON | 0.6 | 0.95 | 20 | 1.5 |
| Thinking OFF | 0.7 | 0.8 | 20 | 1.5 |

**NE PAS utiliser `temperature=0.0`** (greedy decoding) — provoque des boucles infinies et des répétitions.

Le `presence_penalty=1.5` est recommandé pour les modèles AWQ quantifiés.

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

## Compatibilité GPU Blackwell (RTX Pro 5000)

L'image Docker standard `vllm/vllm-openai:latest` est incompatible avec les GPU Blackwell (SM120, driver 580+, CUDA 13.0). Le projet utilise l'image `lmcache/vllm-openai:build-latest` qui supporte Blackwell nativement.

Si vous passez sur un GPU non-Blackwell (Ampere, Ada Lovelace), vous pouvez revenir à l'image standard.

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
