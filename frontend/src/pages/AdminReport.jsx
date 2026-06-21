import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useAppConfig } from '../hooks/useAppConfig.js';
import { getServices, getServiceLabel } from '../utils/industry.js';
import { apiAnalytics } from '../services/api.js';
import Stat from '../components/Stat.jsx';

export default function AdminReport() {
  const { user } = useAuth();
  const cfg = useAppConfig();
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
        setError(err.response?.data?.error || 'Failed to load report data.');
        setLoading(false);
      });
  }, [user]);

  if (!user) return <Navigate to="/admin/login" replace />;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center text-graphite">
        Generating detailed report...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="text-accent mb-4">{error}</div>
        <Link to="/admin" className="btn-secondary">Return to Dashboard</Link>
      </div>
    );
  }

  const { peakHours = {}, peakHoursByService = {}, totalIssued = 0, totalExpired = 0, dropOffRate = 0, avgWaitSeconds = 0, staffingRecommendation = [] } = data || {};

  // Use dynamic services from the configured industry profile
  const services = getServices(cfg.industry).map(s => s.id);
  
  // Dynamically build the hours range from actual data
  const allHoursWithData = Object.keys(peakHours).map(Number).sort((a, b) => a - b);
  // Show a range: from min active hour to max active hour (at least 3 hours wide)
  const minHour = allHoursWithData.length > 0 ? Math.max(0, allHoursWithData[0] - 1) : 8;
  const maxHour = allHoursWithData.length > 0 ? Math.min(23, allHoursWithData[allHoursWithData.length - 1] + 1) : 19;
  const hours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => i + minHour);

  // Per-service max for better relative intensity
  const maxPerService = {};
  services.forEach(s => {
    const vals = Object.values(peakHoursByService[s] || {});
    maxPerService[s] = Math.max(...vals, 1);
  });
  const maxTraffic = Math.max(...Object.values(peakHours), 1);

  const fmt12h = (h) => {
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
  };

  const waitDisplay = avgWaitSeconds < 60
    ? `${Math.round(avgWaitSeconds)}s`
    : `${Math.round(avgWaitSeconds / 60)} min`;

  // Bar chart data — hourly totals
  const chartData = hours.map(h => ({ hour: h, count: peakHours[h] || 0 }));
  const chartMax = Math.max(...chartData.map(d => d.count), 1);
  const BAR_H = 120;
  const BAR_W = Math.max(24, Math.floor(560 / Math.max(hours.length, 1)));
  
  // Suggestion Engine Logic
  let primarySuggestion = "Traffic patterns are currently stable. No queue interventions required.";
  let secondarySuggestion = "";
  
  if (staffingRecommendation && staffingRecommendation.length > 0) {
    const peakStart = staffingRecommendation[0];
    const peakEnd = staffingRecommendation[staffingRecommendation.length - 1] + 1;
    
    primarySuggestion = `High traffic detected during hours ${peakStart}:00 - ${peakEnd}:00. Recommendation: Pause the General Queue at ${peakStart - 1}:45 to prevent backlog overloading.`;
    secondarySuggestion = `Auto-Resume queues at ${peakEnd}:15 when traffic subsides. Ensure maximum staff allocation during the peak window.`;
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 print:py-0 print:px-0">
      
      {/* Print-only header — token ticket style */}
      <div className="hidden print:block mb-8" style={{ fontFamily: '"Georgia", serif' }}>
        {/* Dark stripe — matches token header */}
        <div style={{ background: '#1A1714', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: '#F7F3EC', fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: '600' }}>
              {cfg.orgName && cfg.orgName !== 'QueueLess' ? cfg.orgName : 'QueueLess'}
            </div>
            {cfg.location && (
              <div style={{ color: '#A89E94', fontSize: '10px', marginTop: '4px' }}>{cfg.location}</div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#F7F3EC', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Detailed Report</div>
            <div style={{ color: '#A89E94', fontSize: '9px', marginTop: '4px' }}>
              {new Date().toLocaleDateString()} · {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
        {/* Thin accent underline */}
        <div style={{ height: '3px', background: '#C94F2C' }} />
      </div>

      <div className="flex justify-between items-end mb-10 print:hidden">
        <div>
          <div className="label">Insights & Recommendations</div>
          <h1 className="font-display text-5xl tracking-tightest leading-none mt-2">
            Detailed Report
          </h1>
        </div>
        <button onClick={handlePrint} className="btn-secondary">
          Print / Save PDF
        </button>
      </div>

      <div className="bg-rule p-px mb-10">
        <div className="bg-paper p-8">
          <h2 className="font-display text-2xl mb-4 text-accent">Automated Action Plan</h2>
          <div className="flex gap-3 mb-3">
            <div className="w-1.5 bg-accent opacity-80 shrink-0"></div>
            <p className="text-lg leading-relaxed text-ink font-medium">{primarySuggestion}</p>
          </div>
          {secondarySuggestion && (
            <div className="flex gap-3">
              <div className="w-1.5 bg-graphite opacity-30 shrink-0"></div>
              <p className="text-graphite leading-relaxed">{secondarySuggestion}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-rule mb-12">
        <div className="bg-paper p-5"><Stat label="Total Tokens" value={totalIssued} /></div>
        <div className="bg-paper p-5"><Stat label="Avg Wait" value={waitDisplay} accent /></div>
        <div className="bg-paper p-5"><Stat label="Drop-off Rate" value={`${Math.round((dropOffRate || 0) * 100)}%`} /></div>
        <div className="bg-paper p-5"><Stat label="Tokens Expired" value={totalExpired} /></div>
      </div>

      <h3 className="label mb-4">
        Traffic Heatmap by Service
        {allHoursWithData.length > 0 ? ` · ${fmt12h(minHour)} – ${fmt12h(maxHour)}` : ''}
      </h3>
      <div className="bg-paper border border-rule p-6 mb-12">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr>
                <th className="font-normal text-graphite p-2 border-b border-rule w-32">Service</th>
                {hours.map(h => (
                  <th key={h} className="font-normal text-graphite p-2 border-b border-rule text-center">
                    {h}:00
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {services.map(service => (
                <tr key={service}>
                  <td className="p-2 border-b border-rule border-dashed font-medium">{getServiceLabel(service, cfg.industry)}</td>
                  {hours.map(h => {
                    const count = (peakHoursByService[service] && peakHoursByService[service][h]) || 0;
                    const serviceMax = maxPerService[service] || 1;
                    let intensityClass = 'bg-paper';
                    let textClass = '';
                    if (count > 0) {
                      const ratio = count / serviceMax;
                      if (ratio > 0.75) { intensityClass = 'bg-accent'; textClass = 'text-white'; }
                      else if (ratio > 0.4) { intensityClass = 'bg-[#C0532A] opacity-70'; textClass = 'text-white'; }
                      else if (ratio > 0.1) { intensityClass = 'bg-[#C0532A] opacity-40'; textClass = 'text-ink'; }
                      else { intensityClass = 'bg-[#C0532A] opacity-15'; textClass = 'text-ink'; }
                    }
                    return (
                      <td key={h} className="p-1 border-b border-rule border-dashed">
                        <div className={`h-8 w-full flex items-center justify-center rounded-sm text-xs transition-all font-medium ${intensityClass} ${textClass}`}>
                          {count > 0 ? count : ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-graphite justify-end">
          <span>Less traffic</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 bg-paper border border-rule"></div>
            <div className="w-4 h-4 bg-accent opacity-10"></div>
            <div className="w-4 h-4 bg-accent opacity-40"></div>
            <div className="w-4 h-4 bg-accent opacity-70"></div>
            <div className="w-4 h-4 bg-accent"></div>
          </div>
          <span>More traffic</span>
        </div>
      </div>
      
      {/* Hourly bar chart */}
      {chartData.some(d => d.count > 0) && (
        <>
          <h3 className="label mb-4">Hourly volume chart</h3>
          <div className="bg-paper border border-rule p-6 mb-12 overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartData.length * (BAR_W + 4) + 40} ${BAR_H + 40}`}
              style={{ minWidth: chartData.length * (BAR_W + 4) + 40, height: BAR_H + 40 }}
              aria-label="Hourly token volume bar chart"
            >
              {chartData.map((d, i) => {
                const barH = d.count > 0 ? Math.max(4, Math.round((d.count / chartMax) * BAR_H)) : 0;
                const x = 30 + i * (BAR_W + 4);
                const y = BAR_H - barH;
                return (
                  <g key={d.hour}>
                    {barH > 0 && (
                      <rect
                        x={x} y={y} width={BAR_W} height={barH}
                        className="fill-accent"
                        rx="2"
                      />
                    )}
                    {barH === 0 && (
                      <rect
                        x={x} y={BAR_H - 2} width={BAR_W} height={2}
                        className="fill-rule"
                      />
                    )}
                    {d.count > 0 && (
                      <text
                        x={x + BAR_W / 2} y={y - 4}
                        textAnchor="middle"
                        className="fill-ink"
                        style={{ fontSize: 9 }}
                      >
                        {d.count}
                      </text>
                    )}
                    <text
                      x={x + BAR_W / 2} y={BAR_H + 14}
                      textAnchor="middle"
                      className="fill-graphite"
                      style={{ fontSize: 9 }}
                    >
                      {fmt12h(d.hour).replace(' ', '\n')}
                    </text>
                  </g>
                );
              })}
              <line x1="30" y1="0" x2="30" y2={BAR_H} stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
              <line x1="30" y1={BAR_H} x2={chartData.length * (BAR_W + 4) + 36} y2={BAR_H} stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
            </svg>
          </div>
        </>
      )}

      {/* Print-only footer */}
      <div className="hidden print:block mt-12 pt-4" style={{ borderTop: '1px solid #E4DDD3' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#8A8278', fontFamily: '"Georgia", serif', letterSpacing: '0.08em' }}>
          <span>{cfg.orgName && cfg.orgName !== 'QueueLess' ? cfg.orgName : 'QueueLess'}{cfg.location ? ` · ${cfg.location}` : ''}</span>
          <span style={{ fontFamily: 'monospace' }}>v1.3.0 · cloud-native token qms</span>
        </div>
      </div>
    </div>
  );
}
