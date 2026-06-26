/**
 * LLMProvider — opt-in provider for real LLM backends.
 *
 * Supports OpenAI-compatible chat APIs (OpenAI, Groq, OpenRouter, local Ollama)
 * and Google Gemini. The model is strictly grounded: the retrieved context is
 * the ONLY source of truth and the prompt forbids inventing data.
 */
const { AIProvider } = require('./base');

const SYSTEM_PROMPT = [
  'You are the QueueLess operational assistant for a queue-management system.',
  'Answer ONLY using the JSON CONTEXT provided. Treat it as the single source of truth.',
  'If the answer is not present in the context, clearly state that the required data is unavailable.',
  'Never invent, estimate, or assume numbers that are not in the context.',
  'Be concise and use Markdown (short paragraphs, bullet points, bold key figures).',
].join(' ');

class LLMProvider extends AIProvider {
  constructor(kind, opts) {
    super();
    this.kind = kind;
    this.opts = opts; // { apiKey, model, baseUrl }
  }

  get name() { return this.kind; }

  async answer({ question, history, context }) {
    const system = `${SYSTEM_PROMPT}\n\nCONTEXT (JSON):\n${JSON.stringify(context)}`;
    return this.kind === 'gemini'
      ? this._gemini(system, question, history)
      : this._openaiCompatible(system, question, history);
  }

  async _openaiCompatible(system, question, history) {
    const { baseUrl, apiKey, model } = this.opts;
    const messages = [
      { role: 'system', content: system },
      ...(history || []).slice(-6).map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
      { role: 'user', content: question },
    ];
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ model, messages, temperature: 0.2, stream: false }),
    });
    if (!res.ok) throw new Error(`${this.kind} responded ${res.status}`);
    const data = await res.json();
    return { text: data.choices?.[0]?.message?.content || '', usage: data.usage };
  }

  async _gemini(system, question, history) {
    const { apiKey, model } = this.opts;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const contents = [
      ...(history || []).slice(-6).map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })),
      { role: 'user', parts: [{ text: question }] },
    ];
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: 0.2 },
      }),
    });
    if (!res.ok) throw new Error(`gemini responded ${res.status}`);
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text).join('');
    return { text, usage: data.usageMetadata };
  }
}

module.exports = { LLMProvider };
