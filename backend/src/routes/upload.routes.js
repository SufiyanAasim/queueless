const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { requireStaff } = require('../middleware/auth'); // admin OR staff
const c = require('../controllers/upload.controller');

router.post('/uploads',       requireStaff, asyncHandler(c.create));
router.get('/uploads',        requireStaff, asyncHandler(c.list));
router.get('/uploads/:id',    requireStaff, asyncHandler(c.get));
router.delete('/uploads/:id', requireStaff, asyncHandler(c.remove));

module.exports = router;
