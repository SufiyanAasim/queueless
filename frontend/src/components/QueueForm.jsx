import { useState } from 'react';

export const EMPTY_QUEUE_FORM = { label: '', prefix: '', capacity: '', avgServiceSeconds: '', open: '', close: '' };

export function formToPayload(form) {
  return {
    label: form.label.trim(),
    prefix: form.prefix.trim() || undefined,
    capacity: form.capacity === '' ? null : Number(form.capacity),
    avgServiceSeconds: form.avgServiceSeconds === '' ? null : Number(form.avgServiceSeconds),
    workingHours: form.open && form.close ? { open: form.open, close: form.close } : null,
  };
}

/**
 * Reusable queue create/edit form. Roomy, single-purpose layout so the Create
 * and Manage screens stay uncluttered.
 */
export default function QueueForm({ initial, onSubmit, onCancel, busy, submitLabel = 'Save', error }) {
  const [form, setForm] = useState(initial || EMPTY_QUEUE_FORM);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const field = 'mt-1 w-full border border-rule bg-paper px-3 py-2.5 text-sm focus:outline-none focus:border-ink';

  return (
    <div className="space-y-6">
      <div>
        <label className="block">
          <span className="label">Queue name *</span>
          <input value={form.label} onChange={set('label')} maxLength={50} placeholder="e.g. Eye Specialist" className={field} />
        </label>
        <p className="mt-1.5 text-xs text-graphite">Shown to customers and staff. A url-safe key is derived automatically (e.g. “Eye Specialist” → <span className="font-mono">eye_specialist</span>).</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block">
            <span className="label">Token prefix</span>
            <input value={form.prefix} onChange={set('prefix')} maxLength={4} placeholder="e.g. EY" className={`${field} uppercase`} />
          </label>
          <p className="mt-1.5 text-xs text-graphite">1–4 letters/digits shown before the token number.</p>
        </div>
        <div>
          <label className="block">
            <span className="label">Capacity</span>
            <input type="number" min="0" value={form.capacity} onChange={set('capacity')} placeholder="No limit" className={field} />
          </label>
          <p className="mt-1.5 text-xs text-graphite">Optional — flags the queue when waiting count reaches this.</p>
        </div>
        <div>
          <label className="block">
            <span className="label">Average service time (seconds)</span>
            <input type="number" min="1" value={form.avgServiceSeconds} onChange={set('avgServiceSeconds')} placeholder="e.g. 240" className={field} />
          </label>
          <p className="mt-1.5 text-xs text-graphite">Used for wait-time estimates. Leave blank to use the global default.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Opens</span>
            <input type="time" value={form.open} onChange={set('open')} className={field} />
          </label>
          <label className="block">
            <span className="label">Closes</span>
            <input type="time" value={form.close} onChange={set('close')} className={field} />
          </label>
        </div>
      </div>

      {error && <div className="p-3 border border-accent bg-accent/5 text-accent-deep text-sm">{error}</div>}

      <div className="flex gap-3 pt-2">
        <button onClick={() => onSubmit(form)} disabled={busy || !form.label.trim()} className="btn-primary disabled:opacity-40">
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </div>
  );
}
