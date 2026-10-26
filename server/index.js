import 'dotenv/config'
import express from 'express'
import OpenAI from 'openai'

const app = express()
app.use(express.json())

// Created on first request, not at startup.
let client
function getClient() {
  if (!client) {
    client = new OpenAI({
      baseURL: 'https://api.meta.ai/v1',
      apiKey: process.env.MODEL_API_KEY,
    })
  }
  return client
}

app.post('/api/test', async (_req, res) => {
  try {
    const model = process.env.MODEL_NAME
    if (!model || !process.env.MODEL_API_KEY) {
      return res.status(500).json({ error: 'Set MODEL_API_KEY and MODEL_NAME in .env' })
    }
    const r = await getClient().responses.create({
      model,
      input: 'Say hi in one cheeky sentence. Never flirty.',
      max_output_tokens: 300,
      reasoning: { effort: 'low' },
    })
    console.log(
      `[usage] model=${model} input_tokens=${r.usage?.input_tokens} output_tokens=${r.usage?.output_tokens}`,
    )
    res.json({ reply: r.output_text })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`Pokey server on http://localhost:${port}`))
