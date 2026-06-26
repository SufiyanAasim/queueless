const uploadService = require('../services/upload.service');
const audit = require('../services/audit.service');

async function create(req, res) {
  const { name, type, dataUrl } = req.body || {};
  const file = await uploadService.createUpload({ name, type, dataUrl, owner: req.user.sub });
  audit.record({ actor: req.user.sub, action: 'file.uploaded', target: file.id, meta: { name: file.name, size: file.size } });
  res.status(201).json(file);
}

async function list(req, res) {
  res.json(await uploadService.listFor(req.user.sub));
}

async function get(req, res) {
  res.json(await uploadService.getUpload(req.params.id));
}

async function remove(req, res) {
  const result = await uploadService.deleteUpload(req.params.id, req.user.sub);
  audit.record({ actor: req.user.sub, action: 'file.deleted', target: req.params.id });
  res.json(result);
}

module.exports = { create, list, get, remove };
