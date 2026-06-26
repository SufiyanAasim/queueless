/**
 * AIProvider — the abstraction every provider implements.
 *
 * Business logic (assistant.service) depends only on this interface, never on a
 * concrete provider. Providers are selected/configured via env (see ai/index.js).
 */
class AIProvider {
  get name() { return 'base'; }

  /**
   * @param {object} args
   * @param {string} args.question      the user's question
   * @param {Array}  args.history       prior [{role, content}] turns (optional)
   * @param {object} args.context       retrieved, verified operational data (RAG)
   * @returns {Promise<{ text: string, usage?: object }>}
   */
  // eslint-disable-next-line no-unused-vars
  async answer({ question, history, context }) {
    throw new Error('AIProvider.answer() not implemented');
  }
}

module.exports = { AIProvider };
