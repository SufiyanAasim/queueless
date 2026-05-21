import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiAnalytics } from '../services/api.js';
import Stat from '../components/Stat.jsx';

export default function AdminAnalytics() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    apiAnalytics()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to load analytics.');
        setLoading(false);
      });
  }, [user]);

  if (!user) return <Navigate to="/admin/login" replace />;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center text-graphite">
        <div className="animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center text-warn">
        <div>{error}</div>
      </div>
    );
  }

  const {
    peakHours = {},
    peakHoursByService = { general: {}, consultation: {}, transaction: {} },
    totalIssued = 0,
    totalExpired = 0,
    dropOffRate = 0,
    avgWaitSeconds = 0,
    staffingRecommendation = []
  } = data || {};

  const maxPeak = Math.max(...Object.values(peakHours), 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const { general = {}, consultation = {}, transaction = {} } = peakHoursByService || {};

  // Dynamically find the first and last hours that have data for x-axis labels
  const activeHours = hours.filter(h => (peakHours[h] || 0) > 0);
  const firstActive = activeHours.length > 0 ? activeHours[0] : 0;
  const midActive = activeHours.length > 0 ? activeHours[Math.floor(activeHours.length / 2)] : 12;
  const lastActive = activeHours.length > 0 ? activeHours[activeHours.length - 1] : 23;

  const fmt12h = (h) => {
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
  };

  const waitDisplay = avgWaitSeconds < 60
    ? `${Math.round(avgWaitSeconds)}s`
    : `${Math.round(avgWaitSeconds / 60)} min`;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <div className="label">Admin / Data Mining</div>
          <h1 className="font-display text-5xl tracking-tightest leading-none mt-2">
            Analytics
          </h1>
        </div>
        <Link to="/admin" className="btn-secondary text-sm">← Back to Dashboard</Link>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-rule mb-10">
        <div className="bg-paper p-5">
          <Stat label="Total Tokens Issued" value={totalIssued} />
        </div>
        <div className="bg-paper p-5">
          <Stat label="Total Expired (Abandoned)" value={totalExpired} />
        </div>
        <div className="bg-paper p-5">
          <Stat label="Avg. Drop-off Rate" value={`${(dropOffRate * 100).toFixed(1)}%`} accent />
        </div>
        <div className="bg-paper p-5">
          <Stat label="Avg. Wait Time" value={waitDisplay} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Peak Hours Chart */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
            <h2 className="font-display text-2xl">Traffic Peak Hours</h2>
            <div className="flex gap-3 text-xs text-graphite mt-2 sm:mt-0">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> General</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Consult</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-500 rounded-full"></span> Transact</span>
            </div>
          </div>
          <div className="flex items-end gap-1 h-48 border-b border-l border-rule pb-2 pl-2">
            {hours.map(h => {
              const countG = general[h] || 0;
              const countC = consultation[h] || 0;
              const countT = transaction[h] || 0;
              
              const heightPctG = (countG / maxPeak) * 100;
              const heightPctC = (countC / maxPeak) * 100;
              const heightPctT = (countT / maxPeak) * 100;

              return (
                <div key={h} className="flex-1 flex flex-col justify-end group relative h-full">
                  <div className="flex flex-col justify-end w-full h-full">
                    <div className="bg-purple-500 hover:opacity-80 transition-all w-full" style={{ height: `${heightPctT}%` }}></div>
                    <div className="bg-green-500 hover:opacity-80 transition-all w-full" style={{ height: `${heightPctC}%` }}></div>
                    <div className="bg-blue-500 hover:opacity-80 transition-all w-full" style={{ height: `${heightPctG}%` }}></div>
                  </div>
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-graphite opacity-0 group-hover:opacity-100 transition-opacity">
                    {h}:00
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-4 text-xs text-graphite">
            <span>{fmt12h(firstActive)}</span>
            <span>{fmt12h(midActive)}</span>
            <span>{fmt12h(lastActive)}</span>
          </div>
        </div>

        {/* Dynamic Staffing Recommendation */}
        <div className="card flex flex-col justify-center">
          <h2 className="font-display text-2xl mb-4 text-accent">Smart Staffing Recommendation</h2>
          <p className="text-sm text-graphite mb-6">
            Based on historical data mining analysis, we recommend opening extra counters during high-traffic periods to minimize the {Math.round(avgWaitSeconds / 60)} min average wait time.
          </p>
          <div className="bg-ink text-paper p-6 text-sm">
            {staffingRecommendation.length > 0 ? (
              <>
                <div className="mb-2 uppercase tracking-widest text-xs opacity-70">Peak Load Detected</div>
                <div>We recommend having at least <strong>3 active counters</strong> during the following hours:</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {staffingRecommendation.map(h => (
                    <span key={h} className="bg-paper/20 px-2 py-1 rounded">
                      {h}:00 - {h + 1}:00
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div>Traffic is currently light across all hours. 1 active counter should be sufficient.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
