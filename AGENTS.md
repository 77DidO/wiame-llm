# wiame-llm - Instructions pour Agents IA

Ce fichier contient les instructions pour les assistants IA (Claude, Codex, Copilot, etc.) travaillant sur ce projet.

## Contexte projet

- **Nom** : wiame-llm
- **But** : Serveur LLM local mutualisé pour les projets Wiame
- **Stack** : vLLM + MCP Server (TypeScript) + Docker
- **Modèle** : Qwen3-14B-AWQ (quantifié 4-bit)
- **VRAM** : ~10GB sur RTX Pro 5000 (48GB total)

## Clients utilisateurs

| Client | Usage | Protocole |
|--------|-------|-----------|
| WIAME CR | Génération comptes rendus | OpenAI API |
| WiameRag | RAG question-answering | OpenAI API (LangChain) |
| VSCode | Coding assistance | MCP |

## Structure fichiers

```
wiame-llm/
├── docker-compose.yml      # vLLM + MCP orchestration
├── .env.example            # Variables (HF_TOKEN requis)
├── CLAUDE.md               # Instructions Claude Code
├── AGENTS.md               # Ce fichier
├── README.md               # Doc utilisateur
├── mcp-server/
│   ├── src/index.ts        # Serveur MCP (5 tools)
│   ├── package.json        # Node deps
│   ├── tsconfig.json       # TypeScript config
│   └── Dockerfile          # Multi-stage build
├── models/                 # Modèles locaux (optionnel)
├── scripts/
│   └── download-model.sh   # Télécharger modèle offline
└── docs/
    ├── ARCHITECTURE.md     # Diagrammes architecture
    ├── DEPLOYMENT.md       # Installation serveur
    └── MCP_INTEGRATION.md  # Connexion clients MCP
```

## Conventions code

### TypeScript (MCP Server)

- ESM modules (`"type": "module"`)
- Strict mode enabled
- Zod pour validation schemas
- Async/await, pas de callbacks
- Error handling avec try/catch

### Docker

- Multi-stage builds pour images légères
- Healthchecks sur tous les services
- Volumes nommés pour persistence
- Pas de `runtime: nvidia` (utiliser `deploy.resources`)

## Commandes utiles

```bash
# Dev MCP server
cd mcp-server && npm run dev

# Build
cd mcp-server && npm run build

# Docker
docker compose up -d
docker compose logs -f
docker compose down

# Test API vLLM
curl http://localhost:8000/v1/models
```

## Points d'attention

1. **Nom du modèle** : Le serveur expose le modèle sous le nom `qwen3` (via `--served-model-name qwen3`). Le nom HuggingFace `Qwen/Qwen3-14B-AWQ` n'apparaît que dans la commande `--model` du docker-compose.
2. **Réseau Docker** : Réseau externe `wiame-net` partagé avec RAGWiame et WIAME CR. Créer avec `docker network create wiame-net`.
3. **Port vLLM** : 8000 (interne Docker et exposé)
4. **Port MCP** : 3100 (mais MCP utilise stdio principalement)
4. **HF_TOKEN** : Requis pour télécharger le modèle depuis Hugging Face
5. **VRAM** : Le modèle prend ~10GB, laisser de la marge pour contexte

## API OpenAI (vLLM)

Endpoints compatibles :
- `GET /v1/models` - Liste modèles
- `POST /v1/chat/completions` - Chat
- `POST /v1/completions` - Completion
- `GET /health` - Healthcheck

## Tools MCP

| Tool | Description |
|------|-------------|
| `chat` | Chat avec messages array |
| `complete` | Complétion texte simple |
| `summarize` | Résumé FR (brief/detailed/bullet-points) |
| `rag_query` | Q&A sur contexte fourni |
| `health` | État serveur |

## Évolutions planifiées

- [ ] Ajouter Qwen3-Coder-14B (swap dynamique)
- [ ] Embeddings locaux (BGE-M3)
- [ ] Cache Redis
- [ ] Métriques Prometheus

## Liens projets liés

- **CRAutomatique2** : `c:\Projets\CRAutomatique2` - Client WIAME CR
- **RAGWiame** : `c:\Projets\RAGWiame` - Plateforme RAG marchés publics (accède à vLLM via réseau `wiame-net`)
