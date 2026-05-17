/**
 * Wraps async Express handlers so rejected promises propagate to the
 * global error handler instead of producing an unhandled rejection.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
