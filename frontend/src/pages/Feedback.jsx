import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiSubmitFeedback } from '../services/api.js';

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className={`text-4xl transition-colors ${
            n <= (hovered || value) ? 'text-warn' : 'text-ash'
          }`}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export default function Feedback() {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Please select a rating.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await apiSubmitFeedback(tokenId, rating, comment.trim() || null);
      setDone(true);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <div className="font-display text-5xl tracking-tightest text-success">Thank you.</div>
        <p className="mt-4 text-graphite">Your feedback helps us improve.</p>
        <Link to="/" className="btn-primary mt-8 inline-flex">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <div className="label mb-4">Feedback</div>
      <h1 className="font-display text-5xl tracking-tightest leading-[0.95]">
        How was your experience?
      </h1>
      <p className="mt-4 text-graphite">Your response is anonymous and helps us serve you better.</p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-8">
        <div>
          <span className="label block mb-4">Overall rating</span>
          <StarRating value={rating} onChange={setRating} />
          {rating > 0 && (
            <p className="mt-2 text-sm text-graphite">{LABELS[rating]}</p>
          )}
        </div>

        <div>
          <label className="label block mb-2" htmlFor="comment">
            Comments (optional)
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Tell us what went well or what could be improved…"
            rows={4}
            maxLength={500}
            className="w-full border border-rule bg-cream px-4 py-3 text-sm text-ink placeholder:text-graphite/60 focus:outline-none focus:border-ink resize-none"
          />
          <p className="text-xs text-graphite mt-1">{comment.length}/500</p>
        </div>

        {error && (
          <div className="p-4 border border-accent bg-accent/5 text-accent-deep text-sm">{error}</div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting || !rating} className="btn-primary">
            {submitting ? 'Submitting…' : 'Submit feedback'}
          </button>
          <Link to="/" className="btn-secondary">Skip</Link>
        </div>
      </form>
    </div>
  );
}
