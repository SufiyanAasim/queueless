import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiUpdateConfig } from '../services/api.js';
import { INDUSTRY_PROFILES } from '../utils/industry.js';

export default function AdminSetup() {
  const navigate = useNavigate();
  const [industry, setIndustry] = useState('general');
  const [orgName, setOrgName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!orgName.trim()) { setError('Please enter your organisation name.'); return; }
    setSaving(true);
    setError(null);
    try {
      await apiUpdateConfig(industry, orgName.trim());
      // Invalidate cached config so the app reloads it.
      localStorage.removeItem('queueless.appConfig');
      navigate('/admin');
    } catch (e) {
      setError(e.response?.data?.error || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="label mb-4">First-time setup</div>
      <h1 className="font-display text-5xl tracking-tightest leading-[0.95]">Configure your queue</h1>
      <p className="mt-4 text-graphite max-w-xl">
        Tell us what kind of organisation you are. This sets the service categories customers see when taking a token.
        You can change this any time from Admin Settings.
      </p>

      <div className="mt-10">
        <span className="label block mb-4">Organisation name</span>
        <input
          type="text"
          value={orgName}
          onChange={e => setOrgName(e.target.value)}
          placeholder="e.g. City Bank Karachi, Shifa Hospital"
          className="w-full sm:max-w-md border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
        />
      </div>

      <div className="mt-10">
        <span className="label block mb-4">Industry type</span>
        <div className="grid sm:grid-cols-2 gap-4">
          {Object.entries(INDUSTRY_PROFILES).map(([key, profile]) => (
            <button
              key={key}
              onClick={() => setIndustry(key)}
              className={`text-left p-6 border transition-all ${
                industry === key
                  ? 'border-ink bg-ink text-paper'
                  : 'border-rule bg-cream hover:border-ink'
              }`}
            >
              <div className="label" style={industry === key ? { color: '#F7F3EC99' } : {}}>
                {industry === key ? 'Selected' : 'Profile'}
              </div>
              <div className="mt-3 font-display text-2xl leading-tight">{profile.name}</div>
              <div className={`mt-2 text-xs ${industry === key ? 'text-paper/70' : 'text-graphite'}`}>
                {profile.services.map(s => s.title).join(' · ')}
              </div>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 border border-accent bg-accent/5 text-accent-deep text-sm">{error}</div>
      )}

      <div className="mt-10 pt-8 border-t border-rule flex flex-wrap items-center gap-4">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save & open dashboard →'}
        </button>
        <Link to="/admin/change-password" className="btn-secondary text-sm">
          Change password
        </Link>
      </div>
    </div>
  );
}
