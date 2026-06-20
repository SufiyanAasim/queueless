import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStaff } from '../context/StaffContext.jsx';
import { apiStaffPinLogin } from '../services/api.js';

export default function StaffKiosk() {
  const { staff, loginDirect } = useStaff();
  const navigate = useNavigate();
  const [digits, setDigits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (staff) navigate('/staff', { replace: true });
  }, [staff]);

  const submit = async (pin) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiStaffPinLogin(pin.join(''));
      // loginDirect updates React state so the useEffect above navigates cleanly.
      loginDirect(data.token, data.user);
    } catch (e) {
      setError(e.response?.data?.error || 'Incorrect PIN. Try again.');
      setShake(true);
      setDigits([]);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  const handleDigit = (d) => {
    if (loading) return;
    setError(null);
    const next = [...digits, d];
    setDigits(next);
    if (next.length === 6) submit(next);
  };

  const handleBackspace = () => { setDigits(d => d.slice(0, -1)); setError(null); };
  const handleEnter = () => { if (digits.length >= 4) submit(digits); };

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-paper">
      <div className="w-full max-w-xs">
        <div className="label text-center mb-2">Staff kiosk</div>
        <h1 className="font-display text-4xl tracking-tightest text-center leading-none mb-8">Enter PIN</h1>

        {/* PIN dots */}
        <div className={`flex justify-center gap-3 mb-8 ${shake ? 'animate-shake' : ''}`}>
          {Array.from({ length: Math.max(digits.length + 1, 4) }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < digits.length ? 'bg-ink border-ink' : 'bg-transparent border-rule'
              }`}
            />
          ))}
        </div>

        {error && <div className="mb-4 text-center text-sm text-accent">{error}</div>}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {keys.map((k, i) => {
            if (k === '') return <div key={i} />;
            const isBack = k === '⌫';
            return (
              <button
                key={i}
                onClick={() => isBack ? handleBackspace() : handleDigit(k)}
                disabled={loading}
                className={`aspect-square flex items-center justify-center font-display text-3xl tracking-tightest border transition-colors ${
                  isBack
                    ? 'border-rule text-graphite hover:border-ink hover:text-ink text-xl'
                    : 'border-rule hover:border-ink hover:bg-ink hover:text-paper'
                } disabled:opacity-40`}
              >
                {k}
              </button>
            );
          })}
        </div>

        {/* Enter — for 4–5 digit PINs only (6 auto-submits) */}
        {digits.length >= 4 && digits.length < 6 && (
          <button onClick={handleEnter} disabled={loading} className="btn-primary w-full mt-4">
            {loading ? 'Checking…' : 'Enter →'}
          </button>
        )}
        {loading && <p className="text-center text-xs text-graphite mt-4 animate-pulse">Verifying…</p>}

        <div className="mt-8 text-center">
          <a href="/staff/login" className="text-xs text-graphite hover:text-ink underline underline-offset-2">
            Use username & password instead
          </a>
        </div>
      </div>
    </div>
  );
}
