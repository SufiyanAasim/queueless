/**
 * Validation middleware factory.
 *
 * Usage:
 *   router.post('/login', validate(loginSchema, 'body'), controller);
 *
 * Stops bad input before it reaches the controller, keeping the controller
 * code free of defensive boilerplate.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { value, error } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed.',
        details: error.details.map(d => ({ path: d.path.join('.'), message: d.message })),
      });
    }
    req[source] = value;
    next();
  };
}

module.exports = { validate };
