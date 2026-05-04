import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const ERROR_PREFIX = '__STREAM_ERROR__:'

function classifyError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return 'Invalid API key — check ANTHROPIC_API_KEY in .env.local.'
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'Rate limit or credits exhausted — check your account at console.anthropic.com.'
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return 'Permission denied — your API key may not have access to this model.'
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return 'Could not reach Anthropic API — check your internet connection.'
  }
  if (err instanceof Anthropic.APIError) {
    return `Anthropic API error (${err.status}): ${err.message}`
  }
  return err instanceof Error ? err.message : 'Unknown error'
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY is not configured. Add your key to .env.local and restart the dev server.' },
      { status: 503 },
    )
  }

  let prompt: string
  try {
    const body = await req.json()
    prompt = body.prompt
    if (!prompt || typeof prompt !== 'string') throw new Error('missing prompt')
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const enc = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        })

        for await (const chunk of messageStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(enc.encode(chunk.delta.text))
          }
        }
      } catch (err) {
        controller.enqueue(enc.encode(`${ERROR_PREFIX}${classifyError(err)}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
