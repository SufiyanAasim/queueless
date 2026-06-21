import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { apiUpdateConfig } from '../services/api.js';
import { INDUSTRY_PROFILES } from '../utils/industry.js';

export default function AdminSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cfg = useAppConfig();

  const [industry, setIndustry] = useState('general');
  const [orgName, setOrgName] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Pre-populate from existing config when editing settings
  useEffect(() => {
    if (!cfg) return;
    if (cfg.industry) setIndustry(cfg.industry);
    if (cfg.orgName && cfg.orgName !== 'QueueLess') setOrgName(cfg.orgName);
    if (cfg.location) setLocation(cfg.location);
  }, [cfg?.orgName, cfg?.industry, cfg?.location]);

  if (!user) return <Navigate to="/admin/login" replace />;

  const handleSave = async () => {
    if (!orgName.trim()) { setError('Please enter your organisation name.'); return; }
    setSaving(true);
    setError(null);
    try {
      await apiUpdateConfig(industry, orgName.trim(), location.trim() || null);
      localStorage.removeItem('queueless.appConfig');
      navigate('/admin');
    } catch (e) {
      setError(e.response?.data?.error || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isEditing = cfg?.orgName && cfg.orgName !== 'QueueLess';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 xl:px-10 py-12">
      <div className="label mb-4">{isEditing ? 'Settings' : 'First-time setup'}</div>
      <h1 className="font-display text-5xl tracking-tightest leading-[0.95]">Configure your queue</h1>
      <p className="mt-4 text-graphite max-w-xl">
        Set your organisation name and location. The industry profile controls the service categories customers see when taking a token.
      </p>

      <div className="mt-10">
        <span className="label block mb-2">Organisation name</span>
        <input
          type="text"
          value={orgName}
          onChange={e => setOrgName(e.target.value)}
          placeholder="e.g. Shifa Hospital, Meezan Bank Gulshan Branch"
          className="w-full sm:max-w-md border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
        />
      </div>

      <div className="mt-8">
        <span className="label block mb-1">Location</span>
        <p className="text-xs text-graphite mb-3">Shown in the status bar and on printed tokens — e.g. Karachi, Pakistan</p>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="e.g. Karachi, Pakistan"
          className="w-full sm:max-w-md border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
        />
      </div>

      <div className="mt-10">
        <span className="label block mb-4">Industry profile</span>
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
          {saving ? 'Saving…' : isEditing ? 'Save changes →' : 'Save & open dashboard →'}
        </button>
        <Link to="/admin/change-password" className="btn-secondary text-sm">
          Change password
        </Link>
      </div>
    </div>
  );
}
