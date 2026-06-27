import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/* ── Icons ───────────────────────────────────────────── */
const IconList = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const IconCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

/* ── Data ────────────────────────────────────────────── */
const complaints = [
  { id: 1, subject: 'Hotel overcharging tourists', category: 'Pricing',   status: 'Pending',     date: '2026-06-20' },
  { id: 2, subject: 'Unlicensed tour guide',        category: 'Guide',     status: 'In Progress', date: '2026-06-21' },
  { id: 3, subject: 'Transport safety concern',     category: 'Transport', status: 'Resolved',    date: '2026-06-22' },
  { id: 4, subject: 'Poor hotel hygiene',           category: 'Hotel',     status: 'Pending',     date: '2026-06-23' },
  { id: 5, subject: 'Trekking route hazard',        category: 'Safety',    status: 'In Progress', date: '2026-06-24' },
];

/* Bug fix: map status labels to valid CSS class names */
function statusClass(status) {
  const map = { 'Pending': 'pending', 'In Progress': 'in-progress', 'Resolved': 'resolved' };
  return map[status] ?? 'pending';
}

function AuthorityPage() {
  const navigate = useNavigate();
  const [official, setOfficial] = useState(null);

  useEffect(() => {
    const userRole = sessionStorage.getItem('userRole');
    if (userRole !== 'official') {
      navigate('/login');
      return;
    }
    const stored = sessionStorage.getItem('user');
    if (stored) {
      try { setOfficial(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userRole');
    navigate('/login');
  };

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <p className="eyebrow">Authority Dashboard</p>
          <h1>Tourism Complaint Management System</h1>
        </div>
        <nav className="topnav" aria-label="Primary">
          <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', padding: '0.4rem 0.75rem', borderRadius: '6px' }}>
            Home
          </Link>
          <div className="topnav-divider" />
          {official && (
            <div className="user-chip">
              <div className="user-chip-avatar">{official.name?.[0]?.toUpperCase() ?? 'O'}</div>
              <span className="user-chip-name">{official.name}</span>
            </div>
          )}
          <button className="btn-danger-ghost" onClick={handleLogout}>Logout</button>
        </nav>
      </header>

      <main className="dashboard-layout">
        <div className="dashboard-header">
          <p className="eyebrow">Official Portal</p>
          <h2>Manage & Resolve Complaints</h2>
          <p>Review incoming tourism complaints, update statuses, and escalate where required.</p>
        </div>

        {/* Stats */}
        <div className="dash-stats">
          <div className="dash-stat">
            <div className="dash-stat-icon total"><IconList /></div>
            <div className="dash-stat-body">
              <strong>124</strong>
              <small>Total Complaints</small>
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon done"><IconCheck /></div>
            <div className="dash-stat-body">
              <strong>89</strong>
              <small>Resolved</small>
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon open"><IconClock /></div>
            <div className="dash-stat-body">
              <strong>35</strong>
              <small>Pending / In Progress</small>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card table-card">
          <div className="section-label" style={{ marginBottom: '1.25rem' }}>
            <p className="eyebrow">Recent Complaints</p>
            <h3>Latest complaints requiring attention</h3>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.id}>
                    <td style={{ color: '#8A9099', fontVariantNumeric: 'tabular-nums' }}>{c.id}</td>
                    <td style={{ fontWeight: 500 }}>{c.subject}</td>
                    <td style={{ color: '#6B7280' }}>{c.category}</td>
                    <td>
                      {/* Bug fix: use statusClass() for clean CSS class */}
                      <span className={`badge ${statusClass(c.status)}`}>{c.status}</span>
                    </td>
                    <td style={{ color: '#6B7280', fontVariantNumeric: 'tabular-nums' }}>{c.date}</td>
                    <td>
                      <button className="action-btn">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AuthorityPage;