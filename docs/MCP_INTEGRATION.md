# Intégration MCP

Guide pour connecter des clients MCP au serveur wiame-llm.

## Claude Code / Claude Desktop

Le serveur MCP utilise le transport **SSE** (Server-Sent Events) via HTTP sur le port 3100.

### Configuration locale (vLLM tourne sur la machine)

```json
{
  "mcpServers": {
    "wiame-llm": {
      "url": "http://localhost:3100/sse"
    }
  }
}
```

### Via Docker (production, même réseau wiame-net)

```json
{
  "mcpServers": {
    "wiame-llm": {
      "url": "http://wiame-mcp:3100/sse"
    }
  }
}
```

### Vérification

Dans Claude Code, taper :
```
/mcp
```

Devrait lister `wiame-llm` avec ses 5 tools.

## VSCode + Continue

### Installation

1. Installer l'extension [Continue](https://marketplace.visualstudio.com/items?itemName=Continue.continue)
2. Configurer `~/.continue/config.json` :

```json
{
  "models": [
    {
      "title": "Qwen3-14B (local)",
      "provider": "openai",
      "model": "qwen3",
      "apiBase": "http://localhost:8000/v1",
      "apiKey": "not-needed"
    }
  ]
}
```

## Cursor

### Configuration

Dans Cursor Settings → Models → Custom :

```
Base URL: http://localhost:8000/v1
Model: Qwen/Qwen3-14B-AWQ
API Key: not-needed
```

## LangChain (Python)

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    base_url="http://localhost:8000/v1",
    api_key="not-needed",
    model="qwen3",
    temperature=0.7,
    max_tokens=2048
)

# Utilisation
response = llm.invoke("Résume ce texte: ...")
print(response.content)
```

## OpenAI SDK (Node.js)

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:8000/v1',
  apiKey: 'not-needed'
});

const response = await openai.chat.completions.create({
  model: 'qwen3',
  messages: [
    { role: 'system', content: 'Tu es un assistant professionnel.' },
    { role: 'user', content: 'Bonjour !' }
  ]
});

console.log(response.choices[0].message.content);
```

## Tools MCP disponibles

### chat

Chat avec historique de messages.

```typescript
// Paramètres
{
  messages: [
    { role: "system", content: "Tu es un assistant." },
    { role: "user", content: "Bonjour" }
  ],
  temperature: 0.7,  // optionnel, défaut: 0.7
  max_tokens: 2048   // optionnel, défaut: 2048
}
```

### complete

Complétion de texte simple.

```typescript
{
  prompt: "Le ciel est",
  temperature: 0.7,
  max_tokens: 1024
}
```

### summarize

Résumé en français, optimisé pour les comptes rendus.

```typescript
{
  text: "Transcription de la réunion...",
  style: "detailed"  // "brief" | "detailed" | "bullet-points"
}
```

### rag_query

Réponse basée sur un contexte (pour RAG).

```typescript
{
  question: "Quel est le budget prévu ?",
  context: "Documents récupérés...",
  language: "fr"  // "fr" | "en"
}
```

### health

Vérification de l'état du serveur.

```typescript
// Pas de paramètres
{}

// Réponse
{
  "status": "healthy",
  "models": ["Qwen/Qwen3-14B-AWQ"],
  "vllm_url": "http://localhost:8000/v1"
}
```

## Dépannage

### "Connection refused"

```bash
# Vérifier que vLLM est démarré
curl http://localhost:8000/health

# Vérifier les logs
docker logs wiame-vllm
```

### "Model not found"

Le modèle est servi sous le nom `qwen3` (via `--served-model-name qwen3`). Pour les clients API directs (pas MCP), utiliser `model: "qwen3"`.

### Timeout sur longues requêtes

Augmenter le timeout côté client :

```typescript
const openai = new OpenAI({
  baseURL: 'http://localhost:8000/v1',
  apiKey: 'not-needed',
  timeout: 120000  // 2 minutes
});
```
