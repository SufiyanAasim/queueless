const assistant = require('../ai/assistant.service');
const conversation = require('../ai/conversation.service');

async function ask(req, res) {
  const { question, history, conversationId } = req.body || {};
  const result = await assistant.ask({
    question,
    history: Array.isArray(history) ? history.slice(-10) : [],
    username: req.user.sub,
    conversationId: conversationId || null,
  });
  res.json(result);
}

async function listConversations(req, res) {
  res.json(await conversation.listConversations(req.user.sub));
}

async function createConversation(req, res) {
  const meta = await conversation.createConversation(req.user.sub, req.body?.title);
  res.status(201).json(meta);
}

async function getConversation(req, res) {
  res.json(await conversation.getConversation(req.user.sub, req.params.id));
}

async function updateConversation(req, res) {
  res.json(await conversation.updateConversation(req.user.sub, req.params.id, req.body || {}));
}

async function deleteConversation(req, res) {
  res.json(await conversation.deleteConversation(req.user.sub, req.params.id));
}

module.exports = {
  ask, listConversations, createConversation, getConversation,
  updateConversation, deleteConversation,
};
