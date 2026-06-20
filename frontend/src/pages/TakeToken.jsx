import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiTakeToken } from '../services/api.js';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { getServices } from '../utils/industry.js';

export default function TakeToken() {
  const cfg = useAppConfig();
  const services = getServices(cfg.industry);

  const [service, setService] = useState(services[0]?.id || 'general');
  const [email, setEmail] = useState('');
  const [priority, setPriority] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // If emergency service is selected, auto-flag as priority (medical profile)
  const effectivePriority = priority || service === 'emergency' ? 'priority' : 'normal';

  const handleTake = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const token = await apiTakeToken(service, email.trim() || null, effectivePriority);
      localStorage.setItem('queueless.myToken', JSON.stringify(token));
      navigate(`/token/${token.id}`);
    } catch (e) {
      const status = e.response?.status;
      if (status === 423) setError('The queue is currently paused. Please try again in a few minutes.');
      else if (status === 429) setError('Too many requests. Please slow down and try again.');
      else setError(e.response?.data?.error || 'Could not issue a token. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="label mb-4">Step 1 of 2</div>
      <h1 className="font-display text-5xl sm:text-6xl tracking-tightest leading-[0.95]">
        What brings you in today?
      </h1>
      <p className="mt-4 text-graphite max-w-xl">
        Pick a service so the staff can prepare. You'll get your token number on the next screen.
      </p>

      <div className={`mt-10 grid gap-4 ${services.length <= 3 ? 'sm:grid-cols-3' : services.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {services.map(s => (
          <button
            key={s.id}
            onClick={() => setService(s.id)}
            className={`text-left p-6 border transition-all ${
              service === s.id
                ? 'border-ink bg-ink text-paper'
                : 'border-rule bg-cream hover:border-ink'
            }`}
          >
            <div className="label" style={service === s.id ? { color: '#F7F3EC99' } : {}}>
              {service === s.id ? 'Selected' : 'Service'}
            </div>
            <div className="mt-3 font-display text-xl leading-tight">{s.title}</div>
            <div className={`mt-2 text-xs ${service === s.id ? 'text-paper/70' : 'text-graphite'}`}>
              {s.desc}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-10 pt-10 border-t border-rule space-y-6">
        {/* Priority toggle — not shown for emergency (auto-priority) */}
        {service !== 'emergency' && (
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={priority}
              onChange={e => setPriority(e.target.checked)}
              className="mt-0.5 w-4 h-4 border-rule accent-ink cursor-pointer"
            />
            <div>
              <span className="text-sm font-medium text-ink">Request priority service</span>
              <p className="text-xs text-graphite mt-0.5">
                For elderly, disabled, pregnant, or medical urgency. Priority tokens are called before regular ones.
              </p>
            </div>
          </label>
        )}
        {service === 'emergency' && (
          <div className="p-3 border border-accent bg-accent/5 text-accent-deep text-sm">
            Emergency is automatically flagged as priority and will be called before other tokens.
          </div>
        )}

        <label className="block">
          <span className="label">Email (optional)</span>
          <p className="mt-1 text-xs text-graphite mb-3">
            Get your token number and tracking link sent to your inbox.
          </p>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full sm:max-w-sm border border-rule bg-cream px-4 py-3 text-sm text-ink placeholder:text-graphite/60 focus:outline-none focus:border-ink"
          />
        </label>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <p className="text-sm text-graphite max-w-md">
          By taking a token, you agree to wait roughly in the order shown.
          Your position is saved on this device.
        </p>
        <button onClick={handleTake} disabled={submitting} className="btn-primary">
          {submitting ? 'Issuing token…' : 'Issue my token →'}
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 border border-accent bg-accent/5 text-accent-deep text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
