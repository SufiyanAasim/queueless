import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';

const MODULES = [
  { name: 'System Architecture', desc: 'Monorepo design, deployment topology, branch strategy' },
  { name: 'Backend & APIs', desc: 'Express REST API, queue engine, referral & queue-management services' },
  { name: 'Realtime & Cloud', desc: 'Firebase Realtime Database, security rules, scheduled functions' },
  { name: 'Frontend', desc: 'React + Vite SPA, live dashboards, customer & staff flows' },
  { name: 'Analytics & ML', desc: 'Event pipeline, predictive wait-time & queue-load models' },
  { name: 'CI/CD & Testing', desc: 'GitHub Actions, automated tests, Vercel + Render delivery' },
];

function fireConfetti() {
  const end = Date.now() + 600;
  const colors = ['#E2603F', '#1A1A1A', '#F7F3EC'];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export default function Credits() {
  const [count, setCount] = useState(0);
  const burstRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(fireConfetti, 350);
    return () => clearTimeout(t);
  }, []);

  const handleThanks = () => {
    setCount(c => c + 1);
    confetti({
      particleCount: 60,
      spread: 70,
      origin: burstRef.current
        ? { x: (burstRef.current.getBoundingClientRect().left + burstRef.current.offsetWidth / 2) / window.innerWidth,
            y: (burstRef.current.getBoundingClientRect().top + burstRef.current.offsetHeight / 2) / window.innerHeight }
        : { y: 0.6 },
      colors: ['#E2603F', '#1A1A1A', '#F7F3EC'],
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="label mb-3">QueueLess · Credits</div>
      <h1 className="font-display text-5xl sm:text-7xl tracking-tightest leading-[0.92]">
        Developed by<br />
        <span className="text-accent">Mohammad Sufiyan Aasim </span>
        <a
          href="https://github.com/msufiyanpk"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-2xl sm:text-3xl font-sans font-normal text-graphite hover:text-ink underline ml-3 align-baseline"
        >
          (msufiyanpk)
        </a>
      </h1>
      <p className="mt-5 text-graphite max-w-xl">
        QueueLess — a cloud-native smart token & queue management system. Designed,
        engineered, and shipped end-to-end: architecture, backend, realtime cloud
        infrastructure, frontend, analytics, and delivery pipeline.
      </p>

      {/* Lead card */}
      <div
        className="mt-10 border border-rule bg-cream p-6 sm:p-8 hover:border-ink transition-colors cursor-default"
        onMouseEnter={() => {}}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <img
            src="https://github.com/msufiyanpk.png"
            alt="Mohammad Sufiyan Aasim"
            className="w-20 h-20 shrink-0 object-cover border border-rule bg-ink"
            onError={(e) => {
              // Fallback to text initials if image fails to load
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="hidden w-20 h-20 shrink-0 bg-ink text-paper font-display text-4xl flex items-center justify-center tracking-tightest">
            MS
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-3xl">Mohammad Sufiyan Aasim</div>
            <div className="text-sm text-graphite mt-1">Software Engineer</div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 border border-rule bg-paper">Data Sciences</span>
              <span className="px-2 py-1 border border-rule bg-paper">AI/MLOps Engineering</span>
              <span className="px-2 py-1 border border-rule bg-paper">Software Quality Assurance (SQA)</span>
              <span className="px-2 py-1 border border-rule bg-paper">Full-Stack & Cloud</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href="https://github.com/msufiyanpk"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs flex items-center gap-2 px-3 py-1.5 border border-rule hover:border-ink hover:text-ink transition-colors bg-paper"
              >
                <span>🐈‍⬛</span> GitHub Profile
              </a>
              <a
                href="mailto:sufiyanaasim@outlook.com"
                className="btn-secondary text-xs flex items-center gap-2 px-3 py-1.5 border border-rule hover:border-ink hover:text-ink transition-colors bg-paper"
              >
                <span>✉️</span> Contact Email
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive thanks */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-4">
          <button
            ref={burstRef}
            onClick={handleThanks}
            className="btn-primary"
          >
            🎉 Send a thank-you
          </button>
          {count > 0 && (
            <span className="text-sm text-graphite">
              {count === 1 ? 'Thanks! 🎉' : `${count} thank-yous and counting`} — much appreciated.
            </span>
          )}
        </div>
      </div>

      {/* Modules */}
      <h2 className="mt-14 font-display text-2xl tracking-tightest">What went into it</h2>
      <div className="mt-5 grid gap-px bg-rule sm:grid-cols-2">
        {MODULES.map(m => (
          <div key={m.name} className="bg-paper p-5 hover:bg-cream transition-colors">
            <div className="font-medium">{m.name}</div>
            <div className="text-sm text-graphite mt-1">{m.desc}</div>
          </div>
        ))}
      </div>

      {/* Languages */}
      <h2 className="mt-12 font-display text-2xl tracking-tightest">Languages</h2>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {['JavaScript', 'Python', 'HTML5', 'CSS3'].map(t => (
          <span key={t} className="px-3 py-1.5 border border-rule bg-cream hover:border-ink transition-colors">{t}</span>
        ))}
      </div>

      {/* Frameworks & Tools */}
      <h2 className="mt-10 font-display text-2xl tracking-tightest">Frameworks & Tools</h2>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {['React', 'Vite', 'Tailwind CSS', 'Node.js', 'Express', 'Firebase', 'MongoDB', 'scikit-learn', 'pandas', 'GitHub Actions'].map(t => (
          <span key={t} className="px-3 py-1.5 border border-rule bg-cream hover:border-ink transition-colors">{t}</span>
        ))}
      </div>

      {/* Core Concepts */}
      <h2 className="mt-10 font-display text-2xl tracking-tightest">Core Concepts</h2>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {['Analytics & Data Mining', 'Machine Learning & Predictive Modeling', 'Cloud-Native Architecture', 'Real-Time Data Synchronization', 'Role-Based Access Control (RBAC)', 'Continuous Integration & Delivery (CI/CD)', 'REST API Design'].map(t => (
          <span key={t} className="px-3 py-1.5 border border-rule bg-cream hover:border-ink transition-colors">{t}</span>
        ))}
      </div>

      <div className="mt-14 pt-8 border-t border-rule flex items-center justify-between text-sm">
        <span className="text-graphite font-mono">QueueLess v1.4.5 "Zenith" — Intelligent Collaboration</span>
        <Link to="/" className="btn-secondary text-sm">← Back to home</Link>
      </div>
    </div>
  );
}
