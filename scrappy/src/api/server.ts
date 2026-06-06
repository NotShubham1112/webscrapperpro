import express, { Express, Request, Response } from "express"
import cors from "cors"
import fs from "fs"
import path from "path"
import os from "os"
import { ScrappyAgent } from "../agent/agent"
import type { ChatMessage } from "../agent/llm"
import { resetLLM } from "../agent/llm"
import { loadConfig, saveConfig, configExists, ScrappyConfig } from "../utils/config"

const app: Express = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

const STATIC_MODELS: Record<string, { id: string; name: string; provider: string }[]> = {
  ollama: [
    { id: "llama2", name: "Llama 2", provider: "Ollama" },
    { id: "llama3", name: "Llama 3", provider: "Ollama" },
    { id: "mistral", name: "Mistral", provider: "Ollama" },
    { id: "qwen3.5:9b", name: "Qwen 3.5 9B", provider: "Ollama" },
    { id: "codellama", name: "Code Llama", provider: "Ollama" },
  ],
  openrouter: [
    { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenRouter" },
    { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenRouter" },
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "OpenRouter" },
    { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "OpenRouter" },
    { id: "meta-llama/llama-3.3-70b", name: "Llama 3.3 70B", provider: "OpenRouter" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "Groq" },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", provider: "Groq" },
  ],
  mistral: [
    { id: "mistral-tiny", name: "Mistral Tiny", provider: "Mistral" },
    { id: "mistral-small", name: "Mistral Small", provider: "Mistral" },
    { id: "mistral-medium", name: "Mistral Medium", provider: "Mistral" },
  ],
}

async function getOllamaModels(): Promise<{ id: string; name: string; provider: string }[]> {
  try {
    const res = await fetch("http://localhost:11434/api/tags")
    if (!res.ok) return []
    const data: any = await res.json()
    return (data.models || []).map((m: any) => ({
      id: m.name,
      name: m.name,
      provider: "Ollama",
    }))
  } catch {
    return []
  }
}

// Health check endpoint
app.get("/api/status", (req: Request, res: Response) => {
  res.json({
    status: "online",
    message: "Backend server is running",
    timestamp: new Date().toISOString(),
  })
})

// Ping endpoint
app.get("/api/ping", (req: Request, res: Response) => {
  res.json({ pong: true })
})

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "Scrappy API",
    version: "1.0.0",
    status: "running",
  })
})

// Get current config
app.get("/api/config", (req: Request, res: Response) => {
  try {
    const cfg = configExists() ? loadConfig() : null
    res.json({ config: cfg, configured: !!cfg })
  } catch {
    res.json({ config: null, configured: false })
  }
})

// Save config
app.post("/api/config", (req: Request, res: Response) => {
  const { provider, model, apiKey } = req.body
  if (!provider || !model) {
    return res.status(400).json({ error: "provider and model are required" })
  }
  const config: ScrappyConfig = {
    provider,
    model,
    apiKey: apiKey || null,
  }
  saveConfig(config)
  resetLLM()
  res.json({ success: true, config })
})

// Fetch available Groq models using API key
app.get("/api/groq-models", async (req: Request, res: Response) => {
  const apiKey = req.query.key as string
  if (!apiKey) {
    return res.status(400).json({ error: "API key required" })
  }
  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!response.ok) {
      return res.json({ models: STATIC_MODELS.groq, error: `Groq API error: ${response.status}, using fallback` })
    }
    const data: any = await response.json()
    const models = (data.data || [])
      .filter((m: any) => m.id && !m.id.includes("whisper"))
      .map((m: any) => ({
        id: m.id,
        name: m.id,
        provider: "Groq",
      }))
    res.json({ models: models.length > 0 ? models : STATIC_MODELS.groq })
  } catch (err: any) {
    res.json({ models: STATIC_MODELS.groq, error: err.message })
  }
})

// Get available models
app.get("/api/models", async (req: Request, res: Response) => {
  const ollamaModels = await getOllamaModels()
  res.json({
    ollama: ollamaModels,
    ollamaAvailable: ollamaModels.length > 0,
    openrouter: STATIC_MODELS.openrouter,
    groq: STATIC_MODELS.groq,
    mistral: STATIC_MODELS.mistral,
  })
})

// Chat endpoint with SSE streaming
app.post("/api/chat", async (req: Request, res: Response) => {
  const { message, history, config } = req.body

  if (!message) {
    return res.status(400).json({ error: "message is required" })
  }

  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")

  const chatHistory: ChatMessage[] = (history || []).map((msg: any) => ({
    role: msg.role,
    content: msg.content,
  }))

  try {
    const agent = new ScrappyAgent()
    const response = await agent.process(message, chatHistory, config || undefined)

    if (response.stream) {
      for await (const chunk of response.stream) {
        if (chunk.type === "content" && chunk.text) {
          res.write(`data: ${JSON.stringify({ type: "content", text: chunk.text })}\n\n`)
        } else if (chunk.type === "thought") {
          res.write(`data: ${JSON.stringify({ type: "thought", thoughtTotal: chunk.thoughtTotal })}\n\n`)
        } else if (chunk.type === "done") {
          res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        }
      }
    } else if (response.text) {
      res.write(`data: ${JSON.stringify({ type: "content", text: response.text })}\n\n`)
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`)
    }
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ type: "error", text: err.message || "Unknown error" })}\n\n`)
  }

  res.end()
})

app.listen(PORT, () => {
  console.log(`Scrappy API Server running at http://localhost:${PORT}`)
})

export default app
