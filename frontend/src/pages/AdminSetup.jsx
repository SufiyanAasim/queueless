import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { apiUpdateConfig } from '../services/api.js';
import { INDUSTRY_PROFILES } from '../utils/industry.js';

const CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar',
  'Quetta', 'Hyderabad', 'Gujranwala', 'Sialkot', 'Bahawalpur', 'Sargodha', 'Sukkur',
  'Abbottabad', 'Mardan', 'Gujrat', 'Larkana', 'Sheikhupura',
];

export default function AdminSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cfg = useAppConfig();

  const [industry, setIndustry] = useState('general');
  const [orgName, setOrgName] = useState('');
  const [location, setLocation] = useState('');
  const [displayMessage, setDisplayMessage] = useState('');
  const [slaMinutes, setSlaMinutes] = useState('');
  const [autoResetTime, setAutoResetTime] = useState('');
  const [otherCity, setOtherCity] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Pre-populate from existing config when editing settings
  useEffect(() => {
    if (!cfg) return;
    if (cfg.industry) setIndustry(cfg.industry);
    if (cfg.orgName && cfg.orgName !== 'QueueLess') setOrgName(cfg.orgName);
    if (cfg.location) { setLocation(cfg.location); setOtherCity(!CITIES.includes(cfg.location)); }
    if (cfg.displayMessage) setDisplayMessage(cfg.displayMessage);
    if (cfg.slaMinutes) setSlaMinutes(String(cfg.slaMinutes));
    if (cfg.autoResetTime) setAutoResetTime(cfg.autoResetTime);
  }, [cfg?.orgName, cfg?.industry, cfg?.location, cfg?.displayMessage, cfg?.slaMinutes, cfg?.autoResetTime]);

  if (!user) return <Navigate to="/admin/login" replace />;

  const handleSave = async () => {
    if (!orgName.trim()) { setError('Please enter your organisation name.'); return; }
    setSaving(true);
    setError(null);
    try {
      const trimmedLocation = location.trim() || null;
      const trimmedMessage = displayMessage.trim() || null;
      const parsedSla = slaMinutes ? Number(slaMinutes) : null;
      const trimmedReset = autoResetTime || null;
      await apiUpdateConfig(industry, orgName.trim(), trimmedLocation, trimmedMessage, parsedSla, trimmedReset);
      const newCfg = {
        ...(cfg || {}),
        industry,
        orgName: orgName.trim(),
        location: trimmedLocation,
        displayMessage: trimmedMessage,
        slaMinutes: parsedSla,
        autoResetTime: trimmedReset,
      };
      localStorage.setItem('queueless.appConfig', JSON.stringify(newCfg));
      // Notify all useAppConfig consumers (footer status bar, etc.) immediately.
      window.dispatchEvent(new CustomEvent('queueless:config', { detail: newCfg }));
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
        Set your organisation name and location. The Industry Type sets the default queues customers see — you can add your own under Queues.
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
        <span className="label block mb-1">City / Location</span>
        <p className="text-xs text-graphite mb-3">Shown in the status bar and on printed tokens.</p>
        <div className="flex flex-col sm:flex-row gap-3 sm:max-w-md">
          <select
            value={otherCity ? 'Other' : location}
            onChange={e => {
              const v = e.target.value;
              if (v === 'Other') { setOtherCity(true); setLocation(''); }
              else { setOtherCity(false); setLocation(v); }
            }}
            className="w-full border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
          >
            <option value="">Select a city…</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="Other">Other…</option>
          </select>
          {otherCity && (
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Enter your city"
              className="w-full border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
            />
          )}
        </div>
      </div>

      <div className="mt-10">
        <span className="label block mb-1">Industry Type</span>
        <p className="text-xs text-graphite mb-4">Sets the default queues for your organisation. Add or customise individual queues under <span className="font-medium">Queues</span>.</p>
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

      {/* Display board section */}
      <div className="mt-12 pt-8 border-t border-rule">
        <span className="label block mb-1">Display board</span>
        <div className="mt-6">
          <span className="label block mb-1">Welcome message <span className="normal-case font-normal text-graphite">(optional)</span></span>
          <p className="text-xs text-graphite mb-3">Shown permanently on the display board — e.g. "Welcome to Shifa Hospital. Please take a seat."</p>
          <textarea
            value={displayMessage}
            onChange={e => setDisplayMessage(e.target.value)}
            placeholder="e.g. Welcome to Shifa Hospital. Please take a seat."
            rows={3}
            maxLength={300}
            className="w-full sm:max-w-lg border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink resize-none"
          />
        </div>
      </div>

      {/* Queue behaviour section */}
      <div className="mt-10 pt-8 border-t border-rule">
        <span className="label block mb-6">Queue behaviour</span>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <span className="label block mb-1">SLA wait target <span className="normal-case font-normal text-graphite">(minutes)</span></span>
            <p className="text-xs text-graphite mb-3">Alert threshold for overdue tokens on the dashboard.</p>
            <input
              type="number"
              min="1"
              max="999"
              value={slaMinutes}
              onChange={e => setSlaMinutes(e.target.value)}
              placeholder="e.g. 20"
              className="w-full border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <span className="label block mb-1">Daily auto-reset time</span>
            <p className="text-xs text-graphite mb-3">Queue resets automatically at this time each day (server time).</p>
            <input
              type="time"
              value={autoResetTime}
              onChange={e => setAutoResetTime(e.target.value)}
              className="w-full border border-rule bg-cream px-4 py-3 text-sm focus:outline-none focus:border-ink"
            />
          </div>
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
        <Link to="/admin/manage" className="btn-secondary text-sm">
          Manage admins
        </Link>
      </div>
    </div>
  );
}
