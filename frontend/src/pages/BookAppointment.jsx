import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiBookAppointment } from '../services/api.js';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { getServices } from '../utils/industry.js';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00',
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function BookAppointment() {
  const cfg = useAppConfig();
  const services = getServices(cfg.industry);

  const [form, setForm] = useState({
    name: '', service: services[0]?.id || 'general',
    date: today(), timeSlot: '10:00', phone: '', email: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [booked, setBooked] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Please enter your name.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiBookAppointment(form);
      setBooked(result);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not book appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (booked) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <div className="font-display text-5xl tracking-tightest text-success">Booked</div>
        <p className="mt-4 text-graphite">
          Your appointment is confirmed for <strong>{booked.date}</strong> at <strong>{booked.timeSlot}</strong>.
        </p>
        <div className="mt-6 p-6 border border-rule bg-cream text-sm text-left max-w-sm mx-auto">
          <div className="grid grid-cols-2 gap-3">
            <div><span className="label block">Name</span>{booked.name}</div>
            <div><span className="label block">Service</span>{services.find(s => s.id === booked.service)?.title || booked.service}</div>
            <div><span className="label block">Date</span>{booked.date}</div>
            <div><span className="label block">Time</span>{booked.timeSlot}</div>
          </div>
          <p className="mt-4 text-xs text-graphite">Booking ID: <code className="font-mono">{booked.id.slice(0, 8)}</code></p>
        </div>
        <div className="mt-8 flex gap-4 justify-center">
          <Link to="/take" className="btn-primary">Walk in instead</Link>
          <Link to="/" className="btn-secondary">Go home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="label mb-4">Appointment booking</div>
      <h1 className="font-display text-5xl tracking-tightest leading-[0.95]">Book a slot</h1>
      <p className="mt-4 text-graphite">
        Reserve your visit in advance. Show up at your time and a staff member will be ready for you.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        <div>
          <label className="label block mb-2">Your name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Full name"
            required
            className="w-full border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
          />
        </div>

        <div>
          <label className="label block mb-2">Service</label>
          <div className={`grid gap-3 ${services.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {services.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => set('service', s.id)}
                className={`text-left p-4 border transition-all ${
                  form.service === s.id ? 'border-ink bg-ink text-paper' : 'border-rule bg-cream hover:border-ink'
                }`}
              >
                <div className="text-xs opacity-60 mb-1">{form.service === s.id ? 'Selected' : 'Service'}</div>
                <div className="font-medium text-sm leading-tight">{s.title}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="label block mb-2">Date</label>
            <input
              type="date"
              value={form.date}
              min={today()}
              onChange={e => set('date', e.target.value)}
              required
              className="w-full border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="label block mb-2">Time slot</label>
            <select
              value={form.timeSlot}
              onChange={e => set('timeSlot', e.target.value)}
              className="w-full border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
            >
              {TIME_SLOTS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="label block mb-2">Phone (optional)</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+1 555 000 0000"
              className="w-full border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="label block mb-2">Email (optional)</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 border border-accent bg-accent/5 text-accent-deep text-sm">{error}</div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-rule">
          <Link to="/take" className="text-sm text-graphite hover:text-ink underline underline-offset-2">
            Walk in instead
          </Link>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Booking…' : 'Confirm appointment →'}
          </button>
        </div>
      </form>
    </div>
  );
}
