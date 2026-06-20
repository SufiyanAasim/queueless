const router = require('express').Router();
const Joi = require('joi');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/token.controller');

const takeTokenSchema = Joi.object({
  service: Joi.string().min(1).max(50).default('general'),
  email: Joi.string().email().optional().allow('', null),
  priority: Joi.string().valid('normal', 'priority').default('normal'),
});

const tokenIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

router.post('/', validate(takeTokenSchema), asyncHandler(controller.takeToken));
router.get('/:id', validate(tokenIdParamSchema, 'params'), asyncHandler(controller.getTokenStatus));

module.exports = router;
