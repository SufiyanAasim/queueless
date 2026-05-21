import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiAnalytics } from '../services/api.js';
import Stat from '../components/Stat.jsx';

export default function AdminReport() {
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
  
  const services = ['general', 'consultation', 'transaction'];
  
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
      
      {/* Report Header - Hidden on screen, visible on print */}
      <div className="hidden print:block mb-8 border-b border-rule pb-4">
        <h1 className="font-display text-4xl mb-2">QueueLess Analytics Report</h1>
        <div className="text-sm text-graphite">Generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</div>
        <div className="text-sm text-graphite">Location: Karachi, Pakistan</div>
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
                  <td className="p-2 border-b border-rule border-dashed capitalize font-medium">{service}</td>
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
      
      <div className="text-center text-xs text-graphite print:block hidden mt-10">
        QueueLess Report Generated by Administrative System.
      </div>
    </div>
  );
}
