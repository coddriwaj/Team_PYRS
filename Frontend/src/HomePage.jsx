import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/* ── SVG Icons (inline, no dependency) ─────────────── */
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconArrow = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

/* ── Mountain silhouette SVG (the signature element) ── */
const MountainSilhouette = () => (
  <svg
    className="hero-mountain"
    viewBox="0 0 1200 400"
    preserveAspectRatio="xMidYMax meet"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <polygon points="0,400 160,160 280,260 420,80 540,200 640,100 760,220 900,50 1040,180 1200,110 1200,400" fill="white" />
  </svg>
);

/* ── Data ────────────────────────────────────────────── */
const monthlyStats = [
  { label: 'Received',   value: '1,248', cls: 'received', note: 'New complaints this month' },
  { label: 'Resolved',   value: '972',   cls: 'resolved', note: 'Fully closed & verified' },
  { label: 'In Process', value: '214',   cls: 'pending',  note: 'Currently under review' },
];

const aiWorkflow = [
  {
    step: '01',
    title: 'File a Complaint',
    text: 'Tourists submit text or voice complaints in any language — from any device, any time.',
  },
  {
    step: '02',
    title: 'AI Processing',
    text: 'The AI model categorises the issue (hotel, transport, safety, service) and produces a concise summary.',
  },
  {
    step: '03',
    title: 'Official Review',
    text: 'The complaint is translated into English and routed to the correct authority for action.',
  },
];

const channels = [
  {
    title: 'Tourist Complaint Submission',
    text: 'Register issues with hotels, guides, transport, pricing, or travel services.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: 'AI Complaint Segregation',
    text: 'Automatic categorisation into hotel, transport, safety, or service issues.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    title: 'Official Portal Summary',
    text: 'Summarised, translated complaints reach the official portal for quick response.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
];

const highlights = [
  'Tourist complaint registration',
  'Resolution tracking by officials',
  'Secure visitor & official login',
  'Escalation & response alerts',
];

/* ── Component ───────────────────────────────────────── */
function HomePage() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Bug fix: useEffect always called before any conditional return
  useEffect(() => {
    const stored = sessionStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); }
      catch { /* ignore malformed data */ }
    }
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userRole');
    setUser(null);
    navigate('/');
  };

  const portalHref = user
    ? (user.role === 'official' ? '/authority' : '/public')
    : '/login';

  const portalLabel = user
    ? (user.role === 'official' ? 'Go to Authority Dashboard' : 'Go to Public Dashboard')
    : 'Access Portal';

  return (
    <div className="page-shell">
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="topbar-brand">
          <p className="eyebrow">Government of Nepal</p>
          <h1>Tourism Complaint Management System</h1>
        </div>
        <nav className="topnav" aria-label="Primary">
          <a href="#overview">Overview</a>
          <a href="#services">Services</a>
          <div className="topnav-divider" aria-hidden="true" />
          {user ? (
            <>
              <div className="user-chip">
                <div className="user-chip-avatar">{user.name?.[0]?.toUpperCase() ?? 'U'}</div>
                <span className="user-chip-name">{user.name}</span>
              </div>
              <button className="btn-ghost" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <Link className="btn-ghost" to="/login">Sign In</Link>
          )}
        </nav>
      </header>

      <main className="main-layout">
        {/* ── Hero ── */}
        <section className="hero-card" aria-label="Portal introduction">
          <MountainSilhouette />
          <div className="hero-inner">
            <div className="hero-copy">
              <p className="eyebrow">Report · Track · Resolve</p>
              <h2>Tourism Complaint Management for Nepal.</h2>
              <p className="lead">
                Tourists submit complaints in any language. AI categorises and summarises them.
                Officials act fast with a clear, transparent workflow.
              </p>
              <div className="hero-actions">
                <Link className="btn-primary" to={portalHref}>
                  {portalLabel} <IconArrow />
                </Link>
                <a className="btn-secondary" href="#overview">View Overview</a>
              </div>
              <div className="hero-tags" id="services">
                {highlights.map(h => (
                  <span key={h} className="hero-tag">{h}</span>
                ))}
              </div>
            </div>
            <aside className="hero-stats" aria-label="System highlights">
              <div className="hero-stat">
                <strong>24/7</strong>
                <span>Always-on complaint intake for tourists & field staff</span>
              </div>
              <div className="hero-stat">
                <strong>AI-First</strong>
                <span>Automatic categorisation & multilingual translation</span>
              </div>
              <div className="hero-stat">
                <strong>Tracked</strong>
                <span>Escalations, deadlines & status in one portal</span>
              </div>
            </aside>
          </div>
        </section>

        {/* ── Monthly stats ── */}
        <div className="stats-row" aria-label="Monthly complaint summary">
          {monthlyStats.map(s => (
            <div key={s.label} className="stat-card">
              <p className="stat-card-label">{s.label}</p>
              <p className={`stat-card-value ${s.cls}`}>{s.value}</p>
              <p className="stat-card-note">{s.note}</p>
            </div>
          ))}
        </div>

        {/* ── Workflow ── */}
        <section className="card" id="overview" aria-labelledby="workflow-title">
          <div className="section-label">
            <p className="eyebrow">How It Works</p>
            <h3 id="workflow-title">From complaint to resolution in three steps</h3>
          </div>
          <div className="workflow-grid">
            {aiWorkflow.map(step => (
              <div key={step.step} className="workflow-step">
                <div className="workflow-num">{step.step}</div>
                <h4>{step.title}</h4>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Core services ── */}
        <section className="card" aria-labelledby="services-title">
          <div className="section-label">
            <p className="eyebrow">Core Services</p>
            <h3 id="services-title">Built around complaint handling</h3>
          </div>
          <div className="channel-grid">
            {channels.map(ch => (
              <article key={ch.title} className="channel-card">
                <div className="channel-icon">{ch.icon}</div>
                <h4>{ch.title}</h4>
                <p>{ch.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default HomePage;