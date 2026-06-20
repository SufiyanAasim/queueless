const { refs } = require('../config/firebase');

async function submitFeedback(req, res) {
  const { tokenId, rating, comment } = req.body;

  if (!tokenId) return res.status(400).json({ error: 'tokenId is required.' });
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
  }
  if (comment && comment.length > 500) {
    return res.status(400).json({ error: 'Comment must be 500 characters or fewer.' });
  }

  const tokenSnap = await refs.token(tokenId).once('value');
  if (!tokenSnap.exists()) {
    return res.status(404).json({ error: 'Token not found.' });
  }
  const token = tokenSnap.val();
  if (token.status !== 'served') {
    return res.status(400).json({ error: 'Feedback can only be submitted after the token has been served.' });
  }

  const existing = await refs.feedbackEntry(tokenId).once('value');
  if (existing.exists()) {
    return res.status(409).json({ error: 'Feedback already submitted for this token.' });
  }

  await refs.feedbackEntry(tokenId).set({
    tokenId,
    tokenNumber: token.number,
    service: token.service,
    rating: r,
    comment: comment || null,
    submittedAt: Date.now(),
  });

  res.status(201).json({ message: 'Thank you for your feedback.' });
}

module.exports = { submitFeedback };
