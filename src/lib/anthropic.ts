import Anthropic from '@anthropic-ai/sdk';

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  return new Anthropic({ apiKey });
}

export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5-20251001';
export const ANALYSIS_MODEL = process.env.ANTHROPIC_ANALYSIS_MODEL ?? 'claude-opus-5-5-20251101';
