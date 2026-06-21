import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { getServiceLabel } from '../utils/industry.js';
import { apiAnalytics, ADMIN_TOKEN_KEY } from '../services/api.js';
import Stat from '../components/Stat.jsx';

const COLORS = ['#4B6FBF', '#3F6F4F', '#8B5CF6', '#C84B26', '#B8881C', '#0891B2'];

function BarChart({ data, maxVal, color = '#4B6FBF', labelKey, valueKey }) {
  const max = maxVal || Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="flex items-end gap-1 h-36 border-b border-l border-rule pb-1 pl-1">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
          <div
            className="w-full transition-all"
            style={{ height: `${(d[valueKey] / max) * 100}%`, background: color, opacity: 0.85 }}
          />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block text-xs bg-ink text-paper px-1.5 py-0.5 whitespace-nowrap z-10">
            {d[labelKey]}: {d[valueKey]}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalytics() {
  const { user } = useAuth();
  const cfg = useAppConfig();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = (isManual = false) => {
    if (isManual) setRefreshing(true);
    apiAnalytics()
      .then(res => { setData(res); setLoading(false); setLastUpdated(new Date()); setRefreshing(false); })
      .catch(err => { setError(err.response?.data?.error || 'Failed to load analytics.'); setLoading(false); setRefreshing(false); });
  };

  useEffect(() => {
    if (!user) return;
    fetchData();
    const interval = setInterval(() => fetchData(), 30_000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return <Navigate to="/admin/login" replace />;

  if (loading) return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 xl:px-10 py-20 text-center text-graphite animate-pulse">Loading analytics…</div>
  );
  if (error) {
    const isAuth = error.toLowerCase().includes('authorization') || error.toLowerCase().includes('token') || error.toLowerCase().includes('unauthorized');
    if (isAuth) return <Navigate to="/admin/login" replace />;
    return <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 xl:px-10 py-20 text-center text-warn">{error}</div>;
  }

  const {
    peakHours = {}, peakHoursByService = {},
    totalIssued = 0, totalExpired = 0,
    dropOffRate = 0, avgWaitSeconds = 0,
    staffingRecommendation = [],
    serviceDistribution = {},
    dailyTrend = {},
  } = data || {};

  const fmt12h = (h) => h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`;
  const waitDisplay = avgWaitSeconds < 60 ? `${Math.round(avgWaitSeconds)}s` : `${Math.round(avgWaitSeconds / 60)} min`;

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxPeak = Math.max(...Object.values(peakHours), 1);
  const activeHours = hours.filter(h => (peakHours[h] || 0) > 0);
  const firstH = activeHours[0] ?? 0;
  const midH = activeHours[Math.floor(activeHours.length / 2)] ?? 12;
  const lastH = activeHours[activeHours.length - 1] ?? 23;

  const dailyEntries = Object.entries(dailyTrend).map(([date, count]) => ({
    label: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
    count,
    date,
  }));
  const maxDaily = Math.max(...dailyEntries.map(d => d.count), 1);

  const distEntries = Object.entries(serviceDistribution).map(([svc, count]) => ({
    service: svc,
    label: getServiceLabel(svc, cfg.industry),
    count,
  })).sort((a, b) => b.count - a.count);
  const maxDist = Math.max(...distEntries.map(d => d.count), 1);
  const totalDist = distEntries.reduce((s, d) => s + d.count, 0) || 1;

  // Peak hours bar chart data with stacked services
  const serviceKeys = Object.keys(peakHoursByService);

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 xl:px-10 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="label">Admin · Analytics</div>
          <h1 className="font-display text-5xl tracking-tightest leading-none mt-2">Analytics</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {lastUpdated && <span className="text-xs text-graphite">Updated {lastUpdated.toLocaleTimeString()}</span>}
          <button onClick={() => fetchData(true)} disabled={refreshing} className="btn-secondary text-sm">
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <button
            onClick={async () => {
              const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';
              const token = localStorage.getItem(ADMIN_TOKEN_KEY);
              const res = await fetch(`${base}/admin/analytics/export`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) return alert('Export failed. Please try again.');
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'queue_events.csv'; a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn-secondary text-sm"
          >
            Export CSV
          </button>
          <Link to="/admin" className="btn-secondary text-sm">← Dashboard</Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-rule mb-8">
        <div className="bg-paper p-5"><Stat label="Total Issued" value={totalIssued} /></div>
        <div className="bg-paper p-5"><Stat label="Expired / Abandoned" value={totalExpired} /></div>
        <div className="bg-paper p-5"><Stat label="Drop-off Rate" value={`${(dropOffRate * 100).toFixed(1)}%`} accent /></div>
        <div className="bg-paper p-5"><Stat label="Avg Wait" value={waitDisplay} /></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Daily trend — last 7 days */}
        <div className="card">
          <h2 className="font-display text-2xl mb-5">7-Day Trend</h2>
          <BarChart data={dailyEntries} maxVal={maxDaily} color="#4B6FBF" labelKey="label" valueKey="count" />
          <div className="flex justify-between mt-3 text-xs text-graphite">
            {dailyEntries.map(d => <span key={d.date}>{d.label}</span>)}
          </div>
        </div>

        {/* Service distribution */}
        <div className="card">
          <h2 className="font-display text-2xl mb-5">Service Distribution</h2>
          {distEntries.length === 0 ? (
            <div className="text-center py-10 text-graphite">No data yet.</div>
          ) : (
            <div className="space-y-3">
              {distEntries.map((d, i) => (
                <div key={d.service}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{d.label}</span>
                    <span className="text-graphite">{d.count} · {((d.count / totalDist) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-rule rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(d.count / maxDist) * 100}%`, background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Peak hours stacked bar */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-2">
            <h2 className="font-display text-2xl">Peak Hours</h2>
            <div className="flex flex-wrap gap-3 text-xs text-graphite">
              {serviceKeys.map((k, i) => (
                <span key={k} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {getServiceLabel(k, cfg.industry)}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-0.5 h-40 border-b border-l border-rule pb-1 pl-1">
            {hours.map(h => {
              const total = peakHours[h] || 0;
              const pct = (total / maxPeak) * 100;
              return (
                <div key={h} className="flex-1 flex flex-col justify-end group relative h-full">
                  <div className="w-full" style={{ height: `${pct}%`, background: COLORS[0], opacity: 0.8 }} />
                  {total > 0 && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block text-xs bg-ink text-paper px-1.5 py-0.5 whitespace-nowrap z-10">
                      {fmt12h(h)}: {total}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-graphite">
            <span>{fmt12h(firstH)}</span>
            <span>{fmt12h(midH)}</span>
            <span>{fmt12h(lastH)}</span>
          </div>
        </div>

        {/* Smart staffing recommendation */}
        <div className="card flex flex-col">
          <h2 className="font-display text-2xl mb-3 text-accent">Smart Staffing</h2>
          <p className="text-sm text-graphite mb-5">
            Based on {totalIssued} tokens and {waitDisplay} avg wait. Open additional counters during flagged hours.
          </p>
          <div className="bg-ink text-paper p-5 text-sm flex-1">
            {staffingRecommendation.length > 0 ? (
              <>
                <div className="text-xs uppercase tracking-widest text-paper/60 mb-3">Peak load detected</div>
                <div className="mb-4">Recommend <strong>3+ active counters</strong> during:</div>
                <div className="flex flex-wrap gap-2">
                  {staffingRecommendation.map(h => (
                    <span key={h} className="bg-paper/15 px-2 py-1 text-xs">{h}:00–{h + 1}:00</span>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-paper/70">Traffic is light across all hours. 1 counter is sufficient.</div>
            )}
          </div>
          {totalIssued > 0 && (
            <div className="mt-4 pt-4 border-t border-rule">
              <div className="text-xs text-graphite">
                Completion rate: <strong>{((1 - dropOffRate) * 100).toFixed(0)}%</strong> of tokens served ·
                {' '}{totalExpired} abandoned
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
