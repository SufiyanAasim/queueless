import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiCreateQueue } from '../services/api.js';
import QueueForm, { EMPTY_QUEUE_FORM, formToPayload } from '../components/QueueForm.jsx';

export default function AdminQueueNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!user) return <Navigate to="/admin/login" replace />;

  const handleCreate = async (form) => {
    setBusy(true);
    setError(null);
    try {
      await apiCreateQueue(formToPayload(form));
      navigate('/admin/queues');
    } catch (e) {
      setError(e.response?.data?.error || 'Could not create the queue.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="label mb-3">
        <Link to="/admin/queues" className="hover:text-ink">Queues</Link> · New
      </div>
      <h1 className="font-display text-5xl tracking-tightest leading-[0.95]">Create a queue</h1>
      <p className="mt-4 text-graphite max-w-xl">
        A queue is a counter customers can take a token for. It works alongside your Industry Type and flows straight into the live dashboard.
      </p>

      <div className="mt-10 border border-rule bg-cream p-6 sm:p-8">
        <QueueForm
          initial={EMPTY_QUEUE_FORM}
          onSubmit={handleCreate}
          onCancel={() => navigate('/admin/queues')}
          busy={busy}
          submitLabel="Create queue"
          error={error}
        />
      </div>
    </div>
  );
}
