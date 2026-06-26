const shareService = require('../services/share.service');
const audit = require('../services/audit.service');

async function create(req, res) {
  const { type, title, data, ttlHours } = req.body || {};
  const result = await shareService.createShare({ type, title, data, ttlHours, createdBy: req.user.sub });
  audit.record({ actor: req.user.sub, action: 'share.created', target: result.id, meta: { type: result.type } });
  res.status(201).json(result);
}

async function list(req, res) {
  res.json(await shareService.listSharesFor(req.user.sub));
}

// Public — the share id is the capability.
async function get(req, res) {
  res.json(await shareService.getShare(req.params.id));
}

async function revoke(req, res) {
  const result = await shareService.revokeShare(req.params.id, req.user.sub);
  audit.record({ actor: req.user.sub, action: 'share.revoked', target: req.params.id });
  res.json(result);
}

module.exports = { create, list, get, revoke };
