import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const IconList = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
const IconCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

function priorityClass(priority) {
  const normalized = String(priority || 'medium').toLowerCase();
  return ['high', 'medium', 'low'].includes(normalized) ? normalized : 'medium';
}

function formatDate(value) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function AuthorityPage() {
  const navigate = useNavigate();
  const [official, setOfficial] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userRole = sessionStorage.getItem('userRole');
    if (userRole !== 'official') {
      navigate('/login');
      return;
    }
    const stored = sessionStorage.getItem('user');
    if (stored) {
      try {
        setOfficial(JSON.parse(stored));
      } catch {
        // Ignore malformed session data.
      }
    }
  }, [navigate]);

  useEffect(() => {
    const loadComplaints = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/gemini/complaints');
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load complaints.');
        setComplaints(data.complaints || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadComplaints();
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userRole');
    navigate('/login');
  };

  const highPriorityCount = complaints.filter((complaint) => complaint.criticalness === 'high').length;
  const categorizedCount = complaints.filter((complaint) => complaint.category && complaint.category !== 'Other').length;

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <p className="eyebrow">Authority Dashboard</p>
          <h1>Tourism Complaint Management System</h1>
        </div>
        <nav className="topnav" aria-label="Primary">
          <Link to="/">Home</Link>
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
          <h2>Manage Gemini Classified Complaints</h2>
          <p>Review AI transcripts, categories, summaries, and priority levels from public audio submissions.</p>
        </div>

        <div className="dash-stats">
          <div className="dash-stat">
            <div className="dash-stat-icon total"><IconList /></div>
            <div className="dash-stat-body">
              <strong>{complaints.length}</strong>
              <small>Total Gemini Complaints</small>
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon done"><IconCheck /></div>
            <div className="dash-stat-body">
              <strong>{categorizedCount}</strong>
              <small>Categorized</small>
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon open"><IconClock /></div>
            <div className="dash-stat-body">
              <strong>{highPriorityCount}</strong>
              <small>High Priority</small>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <div className="authority-grid">
          <div className="card table-card">
            <div className="section-label" style={{ marginBottom: '1.25rem' }}>
              <p className="eyebrow">Recent Complaints</p>
              <h3>Latest Gemini results requiring attention</h3>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Tourist</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Language</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan="6" style={{ color: '#6B7280' }}>Loading complaints...</td>
                    </tr>
                  )}
                  {!loading && complaints.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ color: '#6B7280' }}>No Gemini complaints have been submitted yet.</td>
                    </tr>
                  )}
                  {!loading && complaints.map((complaint) => (
                    <tr key={complaint.id}>
                      <td style={{ fontWeight: 500 }}>{complaint.touristName || 'Anonymous'}</td>
                      <td style={{ color: '#4A5568' }}>{complaint.category || 'Other'}</td>
                      <td>
                        <span className={`badge ${priorityClass(complaint.criticalness)}`}>
                          {complaint.criticalness || 'medium'}
                        </span>
                      </td>
                      <td style={{ color: '#6B7280' }}>{complaint.detectedLanguage || 'Unknown'}</td>
                      <td style={{ color: '#6B7280', fontVariantNumeric: 'tabular-nums' }}>{formatDate(complaint.createdAt)}</td>
                      <td>
                        <button className="action-btn" onClick={() => setSelectedComplaint(complaint)}>View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card result-card">
            <div className="section-label">
              <p className="eyebrow">Complaint Detail</p>
              <h3>AI transcript and classification</h3>
            </div>

            {!selectedComplaint ? (
              <div className="empty-result">
                <p>Select a complaint to view its Gemini transcript, category, summary, and translation.</p>
              </div>
            ) : (
              <div className="result-stack">
                <div className="result-meta">
                  <span className={`badge ${priorityClass(selectedComplaint.criticalness)}`}>
                    {selectedComplaint.criticalness} priority
                  </span>
                  <span className="result-pill">{selectedComplaint.category || 'Other'}</span>
                  <span className="result-pill">{selectedComplaint.detectedLanguage || 'Unknown'}</span>
                </div>
                <div>
                  <h4>Summary</h4>
                  <p>{selectedComplaint.summary || 'No summary returned.'}</p>
                </div>
                <div>
                  <h4>Original transcript</h4>
                  <p>{selectedComplaint.originalTranscript || 'No transcript returned.'}</p>
                </div>
                <div>
                  <h4>English translation</h4>
                  <p>{selectedComplaint.translatedText || 'No translation returned.'}</p>
                </div>
                <div className="detail-grid">
                  <div>
                    <h4>Location</h4>
                    <p>{selectedComplaint.location || 'Not provided'}</p>
                  </div>
                  <div>
                    <h4>Nationality</h4>
                    <p>{selectedComplaint.touristNationality || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default AuthorityPage;
