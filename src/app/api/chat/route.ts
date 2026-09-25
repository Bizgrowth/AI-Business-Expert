import { NextRequest } from 'next/server';
import { getAnthropicClient, DEFAULT_MODEL, ANALYSIS_MODEL } from '@/lib/anthropic';
import { getSystemPrompt } from '@/lib/agents/prompts';
import type { AgentType } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  agentType: AgentType;
  documentContext: string;
  useAnalysisModel?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { messages, agentType, documentContext, useAnalysisModel = false } = body;

    if (!messages?.length) {
      return new Response('No messages provided', { status: 400 });
    }

    const client = getAnthropicClient();
    const systemPrompt = getSystemPrompt(agentType, documentContext);
    const model = useAnalysisModel ? ANALYSIS_MODEL : DEFAULT_MODEL;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = client.messages.stream({
            model,
            max_tokens: 8192,
            system: systemPrompt,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
          });

          for await (const event of anthropicStream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Stream error';
          controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Request failed';
    return new Response(msg, { status: 500 });
  }
}
