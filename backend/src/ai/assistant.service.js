/**
 * Assistant orchestrator: retrieve verified context (RAG) → ask the configured
 * provider → return a grounded answer. On provider failure it fails over to the
 * deterministic GroundedProvider so the assistant never goes dark.
 */
const { getProvider, groundedProvider } = require('./index');
const { retrieveContext } = require('./retrieval');
const conversation = require('./conversation.service');

async function ask({ question, history = [], username = null, conversationId = null }) {
  if (!question || !String(question).trim()) {
    throw Object.assign(new Error('A question is required.'), { statusCode: 400 });
  }

  // When persisting to a saved conversation, use its stored history as the
  // source of truth (ignoring any client-supplied history).
  let effectiveHistory = history;
  if (username && conversationId) {
    const conv = await conversation.getConversation(username, conversationId).catch(() => null);
    if (conv) effectiveHistory = conv.messages.map(m => ({ role: m.role, content: m.content }));
  }

  const context = await retrieveContext();
  const provider = getProvider();

  let result;
  let usedProvider = provider.name;
  let fellBack = false;
  try {
    result = await provider.answer({ question, history: effectiveHistory, context });
    if (!result || !result.text) throw new Error('Empty response');
  } catch (err) {
    console.error('[ai] provider failed, falling back to grounded:', err.message);
    result = await groundedProvider.answer({ question, history: effectiveHistory, context });
    usedProvider = 'grounded';
    fellBack = true;
  }

  if (result.usage) {
    console.log(`[ai] usage provider=${usedProvider} ${JSON.stringify(result.usage)}`);
  }

  // Persist the turn pair when a saved conversation is targeted.
  if (username && conversationId) {
    await conversation.addTurn(username, conversationId, 'user', question).catch(() => {});
    await conversation.addTurn(username, conversationId, 'assistant', result.text).catch(() => {});
  }

  return {
    answer: result.text,
    provider: usedProvider,
    fellBack,
    sources: context.sources,
    retrievedAt: context.generatedAt,
    conversationId: conversationId || null,
  };
}

module.exports = { ask };
