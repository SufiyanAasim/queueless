const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { requireStaff } = require('../middleware/auth'); // admin OR staff
const c = require('../controllers/share.controller');

// Authenticated management.
router.post('/shares',       requireStaff, asyncHandler(c.create));
router.get('/shares',        requireStaff, asyncHandler(c.list));
router.delete('/shares/:id', requireStaff, asyncHandler(c.revoke));

// Public capability link — no auth; the random id is the secret.
router.get('/share/:id',     asyncHandler(c.get));

module.exports = router;
