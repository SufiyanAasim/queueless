/**
 * AI provider factory.
 *
 * Selects a provider from configuration (AI_PROVIDER) and resolves sensible
 * defaults per backend. Falls back to the zero-config GroundedProvider whenever
 * an LLM provider is selected without credentials, so the assistant always works.
 */
const { GroundedProvider } = require('./providers/grounded');
const { LLMProvider } = require('./providers/llm');
const config = require('../config/env');

const DEFAULT_BASE_URLS = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  ollama: 'http://localhost:11434/v1',
};

const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  groq: 'llama-3.1-8b-instant',
  openrouter: 'meta-llama/llama-3.1-8b-instruct',
  ollama: 'llama3.1',
  gemini: 'gemini-1.5-flash',
};

const groundedProvider = new GroundedProvider();

function getProvider() {
  const kind = (config.ai.provider || 'grounded').toLowerCase();
  if (kind === 'grounded') return groundedProvider;

  // LLM providers need a key (Ollama runs locally without one).
  if (kind !== 'ollama' && !config.ai.apiKey) return groundedProvider;

  return new LLMProvider(kind, {
    apiKey: config.ai.apiKey,
    model: config.ai.model || DEFAULT_MODELS[kind] || DEFAULT_MODELS.openai,
    baseUrl: config.ai.baseUrl || DEFAULT_BASE_URLS[kind] || DEFAULT_BASE_URLS.openai,
  });
}

module.exports = { getProvider, groundedProvider };
