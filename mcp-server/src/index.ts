import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import OpenAI from "openai";

const VLLM_BASE_URL = process.env.VLLM_BASE_URL || "http://localhost:8000/v1";

const openai = new OpenAI({
  baseURL: VLLM_BASE_URL,
  apiKey: "not-needed", // vLLM doesn't require API key
});

const server = new McpServer({
  name: "wiame-llm",
  version: "1.0.0",
});

// Tool: Chat completion
server.tool(
  "chat",
  "Send a chat message to Qwen3 LLM",
  {
    messages: z
      .array(
        z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string(),
        })
      )
      .describe("Chat messages"),
    temperature: z.number().min(0).max(2).default(0.7).describe("Sampling temperature"),
    max_tokens: z.number().max(8192).default(2048).describe("Maximum tokens to generate"),
  },
  async ({ messages, temperature, max_tokens }) => {
    try {
      const response = await openai.chat.completions.create({
        model: "Qwen/Qwen3-14B-AWQ",
        messages,
        temperature,
        max_tokens,
      });

      return {
        content: [
          {
            type: "text",
            text: response.choices[0]?.message?.content || "",
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Text completion (simple)
server.tool(
  "complete",
  "Complete a text prompt with Qwen3 LLM",
  {
    prompt: z.string().describe("Text prompt to complete"),
    temperature: z.number().min(0).max(2).default(0.7).describe("Sampling temperature"),
    max_tokens: z.number().max(8192).default(1024).describe("Maximum tokens to generate"),
  },
  async ({ prompt, temperature, max_tokens }) => {
    try {
      const response = await openai.chat.completions.create({
        model: "Qwen/Qwen3-14B-AWQ",
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens,
      });

      return {
        content: [
          {
            type: "text",
            text: response.choices[0]?.message?.content || "",
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Summarize text (for CR)
server.tool(
  "summarize",
  "Summarize text in French (optimized for meeting reports)",
  {
    text: z.string().describe("Text to summarize"),
    style: z
      .enum(["brief", "detailed", "bullet-points"])
      .default("detailed")
      .describe("Summary style"),
  },
  async ({ text, style }) => {
    const stylePrompts = {
      brief: "Fais un résumé très concis en 2-3 phrases.",
      detailed: "Fais un résumé détaillé et structuré.",
      "bullet-points": "Fais un résumé sous forme de liste à puces.",
    };

    try {
      const response = await openai.chat.completions.create({
        model: "Qwen/Qwen3-14B-AWQ",
        messages: [
          {
            role: "system",
            content:
              "Tu es un assistant spécialisé dans la rédaction de comptes rendus de réunion en français. Tu es précis, professionnel et structuré.",
          },
          {
            role: "user",
            content: `${stylePrompts[style]}\n\nTexte à résumer:\n${text}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      });

      return {
        content: [
          {
            type: "text",
            text: response.choices[0]?.message?.content || "",
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: RAG Query
server.tool(
  "rag_query",
  "Answer a question based on provided context (for RAG)",
  {
    question: z.string().describe("Question to answer"),
    context: z.string().describe("Context documents to use for answering"),
    language: z.enum(["fr", "en"]).default("fr").describe("Response language"),
  },
  async ({ question, context, language }) => {
    const systemPrompt =
      language === "fr"
        ? "Tu es un assistant qui répond aux questions en te basant uniquement sur le contexte fourni. Si l'information n'est pas dans le contexte, dis-le clairement. Réponds en français."
        : "You are an assistant that answers questions based only on the provided context. If the information is not in the context, say so clearly.";

    try {
      const response = await openai.chat.completions.create({
        model: "Qwen/Qwen3-14B-AWQ",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Contexte:\n${context}\n\nQuestion: ${question}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 2048,
      });

      return {
        content: [
          {
            type: "text",
            text: response.choices[0]?.message?.content || "",
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Health check
server.tool("health", "Check if the LLM server is healthy", {}, async () => {
  try {
    const models = await openai.models.list();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "healthy",
              models: models.data.map((m) => m.id),
              vllm_url: VLLM_BASE_URL,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ status: "unhealthy", error: message }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("wiame-llm MCP server started");
}

main().catch(console.error);
