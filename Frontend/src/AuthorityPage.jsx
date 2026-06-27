import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GoogleComplaintMap from './GoogleComplaintMap';

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

const CATEGORY_FILTERS = [
  { value: 'all', label: 'All Categories', keywords: [] },
  { value: 'road', label: 'Road Problems', keywords: ['road', 'route', 'path', 'trail', 'traffic', 'street', 'bridge', 'pothole', 'blocked'] },
  { value: 'harassment', label: 'Harassment', keywords: ['harassment', 'harass', 'abuse', 'threat', 'misconduct'] },
  { value: 'safety', label: 'Safety', keywords: ['safety', 'danger', 'hazard', 'unsafe', 'accident', 'emergency'] },
  { value: 'transport', label: 'Transport', keywords: ['transport', 'taxi', 'bus', 'vehicle', 'driver', 'ride'] },
  { value: 'hotel', label: 'Hotel / Accommodation', keywords: ['hotel', 'accommodation', 'room', 'lodge', 'guest house'] },
  { value: 'pricing', label: 'Pricing / Overcharging', keywords: ['pricing', 'overcharging', 'overcharge', 'price', 'payment', 'scam'] },
  { value: 'guide', label: 'Tour Guide', keywords: ['guide', 'trekking guide', 'tour guide'] },
  { value: 'cleanliness', label: 'Cleanliness', keywords: ['cleanliness', 'hygiene', 'dirty', 'sanitation', 'waste'] },
  { value: 'other', label: 'Other', keywords: ['other'] },
];

const STATUS_OPTIONS = [
  { value: 'not_resolved', label: 'Not Resolved' },
  { value: 'in_process', label: 'In Process' },
  { value: 'resolved', label: 'Resolved' },
];

function priorityClass(priority) {
  const normalized = String(priority || 'medium').toLowerCase();
  return ['high', 'medium', 'low'].includes(normalized) ? normalized : 'medium';
}

function statusLabel(status) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || 'Not Resolved';
}

function statusClass(status) {
  return status === 'resolved' ? 'resolved' : status === 'in_process' ? 'in-process' : 'pending';
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

function parseLocation(location) {
  if (!location) return null;
  const [latText, lngText] = String(location).split(',').map((part) => part.trim());
  const lat = Number(latText);
  const lng = Number(lngText);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function AuthorityPage() {
  const navigate = useNavigate();
  const [official, setOfficial] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [filters, setFilters] = useState({
    category: 'all',
    priority: 'all',
    status: 'all',
    search: '',
  });
  const [updatingStatusId, setUpdatingStatusId] = useState('');
  const [sendingEmailId, setSendingEmailId] = useState('');
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({ category: 'all', priority: 'all', status: 'all', search: '' });
  };

  const updateComplaintStatus = async (complaintId, status) => {
    setUpdatingStatusId(complaintId);
    setError('');
    try {
      const res = await fetch(`/api/gemini/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update complaint status.');

      setComplaints((prev) => prev.map((complaint) => (
        complaint.id === complaintId ? data.complaint : complaint
      )));
      setSelectedComplaint((prev) => (
        prev?.id === complaintId ? data.complaint : prev
      ));
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingStatusId('');
    }
  };

  const sendNotificationEmail = async (complaintId) => {
    setSendingEmailId(complaintId);
    setError('');
    try {
      const res = await fetch(`/api/gemini/complaints/${complaintId}/notify`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send notification email.');

      setComplaints((prev) => prev.map((complaint) => (
        complaint.id === complaintId ? data.complaint : complaint
      )));
      setSelectedComplaint((prev) => (
        prev?.id === complaintId ? data.complaint : prev
      ));
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingEmailId('');
    }
  };

  const complaintMatchesCategory = (complaint) => {
    if (filters.category === 'all') return true;
    const selected = CATEGORY_FILTERS.find((category) => category.value === filters.category);
    const categoryText = [
      complaint.category,
      complaint.summary,
      complaint.translatedText,
      complaint.originalTranscript,
    ].join(' ').toLowerCase();

    return selected?.keywords.some((keyword) => categoryText.includes(keyword)) ?? true;
  };

  const filteredComplaints = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return complaints.filter((complaint) => {
      const priorityMatches = filters.priority === 'all' || priorityClass(complaint.criticalness) === filters.priority;
      const statusMatches = filters.status === 'all' || (complaint.status || 'not_resolved') === filters.status;
      const searchMatches = !search || [
        complaint.touristName,
        complaint.inputType,
        complaint.category,
        complaint.concernedAuthority,
        complaint.concernedAuthorityEmail,
        complaint.photoFileName,
        complaint.location,
        complaint.detectedLanguage,
        complaint.summary,
        complaint.translatedText,
      ].join(' ').toLowerCase().includes(search);

      return priorityMatches && statusMatches && searchMatches && complaintMatchesCategory(complaint);
    });
  }, [complaints, filters]);

  const highPriorityCount = complaints.filter((complaint) => complaint.criticalness === 'high').length;
  const resolvedCount = complaints.filter((complaint) => complaint.status === 'resolved').length;
  const problemRepetition = useMemo(() => {
    const counts = filteredComplaints.reduce((acc, complaint) => {
      const category = complaint.category || 'Other';
      if (!acc[category]) {
        acc[category] = {
          category,
          total: 0,
          high: 0,
          medium: 0,
          low: 0,
        };
      }

      const priority = priorityClass(complaint.criticalness);
      acc[category].total += 1;
      acc[category][priority] += 1;
      return acc;
    }, {});

    return Object.values(counts).sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
  }, [filteredComplaints]);
  const topProblem = problemRepetition[0];
  const mapMarkers = useMemo(() => filteredComplaints
    .map((complaint) => ({
      id: complaint.id,
      title: complaint.summary || complaint.category || 'Complaint',
      category: complaint.category,
      criticalness: priorityClass(complaint.criticalness),
      position: parseLocation(complaint.location),
      raw: complaint,
    }))
    .filter((marker) => marker.position), [filteredComplaints]);

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
              <small>Total Complaints</small>
            </div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon done"><IconCheck /></div>
            <div className="dash-stat-body">
              <strong>{resolvedCount}</strong>
              <small>Resolved</small>
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

        <div className="card repetition-card">
          <div className="section-label" style={{ marginBottom: '1rem' }}>
            <p className="eyebrow">Problem Repetition</p>
            <h3>Most repeated complaint types</h3>
          </div>
          <div className="repetition-summary">
            <div>
              <strong>{topProblem?.category || 'No data'}</strong>
              <span>Most repeated type</span>
            </div>
            <div>
              <strong>{topProblem?.total || 0}</strong>
              <span>Reports in current filter</span>
            </div>
          </div>
          {problemRepetition.length === 0 ? (
            <div className="empty-chart">
              <p>No complaint categories available for the selected filters.</p>
            </div>
          ) : (
            <div className="repetition-list">
              {problemRepetition.map((item) => {
                const percentage = filteredComplaints.length
                  ? Math.round((item.total / filteredComplaints.length) * 100)
                  : 0;

                return (
                  <div className="repetition-row" key={item.category}>
                    <div className="repetition-row-head">
                      <span>{item.category}</span>
                      <strong>{item.total}</strong>
                    </div>
                    <div className="repetition-track" aria-label={`${item.category}: ${item.total} reports`}>
                      <div className="repetition-fill" style={{ width: `${Math.max(percentage, 4)}%` }} />
                    </div>
                    <div className="repetition-meta">
                      <span>{percentage}% of visible reports</span>
                      <span>{item.high} high / {item.medium} medium / {item.low} low</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card map-card">
          <div className="section-label" style={{ marginBottom: '1rem' }}>
            <p className="eyebrow">Complaint Map</p>
            <h3>Reports by location and criticalness</h3>
          </div>
          <div className="map-legend">
            <span><i className="legend-dot high" />High</span>
            <span><i className="legend-dot medium" />Medium</span>
            <span><i className="legend-dot low" />Low</span>
          </div>
          <GoogleComplaintMap
            markers={mapMarkers}
            selectedId={selectedComplaint?.id}
            onMarkerClick={setSelectedComplaint}
            emptyMessage="No filtered complaints have valid location coordinates."
          />
        </div>

        <div className="authority-grid">
          <div className="card table-card">
            <div className="section-label" style={{ marginBottom: '1.25rem' }}>
              <p className="eyebrow">Recent Complaints</p>
              <h3>Latest results requiring attention</h3>
            </div>

            <div className="filter-bar">
              <div className="field">
                <label htmlFor="category">Category</label>
                <select id="category" name="category" value={filters.category} onChange={handleFilterChange}>
                  {CATEGORY_FILTERS.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="priority">Priority</label>
                <select id="priority" name="priority" value={filters.priority} onChange={handleFilterChange}>
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" value={filters.status} onChange={handleFilterChange}>
                  <option value="all">All Statuses</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
              <div className="field filter-search">
                <label htmlFor="search">Search</label>
                <input
                  id="search"
                  name="search"
                  type="search"
                  placeholder="Tourist, place, category, text"
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </div>
              <button type="button" className="btn-secondary filter-reset" onClick={resetFilters}>
                Reset
              </button>
            </div>

            <p className="filter-count">
              Showing {filteredComplaints.length} of {complaints.length} complaints
            </p>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Tourist</th>
                    <th>Source</th>
                    <th>Category</th>
                    <th>Authority</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Email</th>
                    <th>Language</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan="10" style={{ color: '#6B7280' }}>Loading complaints...</td>
                    </tr>
                  )}
                  {!loading && complaints.length === 0 && (
                    <tr>
                      <td colSpan="10" style={{ color: '#6B7280' }}>No Gemini complaints have been submitted yet.</td>
                    </tr>
                  )}
                  {!loading && complaints.length > 0 && filteredComplaints.length === 0 && (
                    <tr>
                      <td colSpan="10" style={{ color: '#6B7280' }}>No complaints match the selected filters.</td>
                    </tr>
                  )}
                  {!loading && filteredComplaints.map((complaint) => (
                    <tr key={complaint.id}>
                      <td style={{ fontWeight: 500 }}>{complaint.touristName || 'Anonymous'}</td>
                      <td>
                        <span className="result-pill">{complaint.inputType || 'text'}</span>
                      </td>
                      <td style={{ color: '#4A5568' }}>{complaint.category || 'Other'}</td>
                      <td style={{ color: '#4A5568' }}>{complaint.concernedAuthority || 'Tourism Complaint Cell'}</td>
                      <td>
                        <span className={`badge ${priorityClass(complaint.criticalness)}`}>
                          {complaint.criticalness || 'medium'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusClass(complaint.status)}`}>
                          {statusLabel(complaint.status)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${complaint.notificationEmailSent ? 'resolved' : 'pending'}`}>
                          {complaint.notificationEmailSent ? 'Sent' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ color: '#6B7280' }}>{complaint.detectedLanguage || 'Unknown'}</td>
                      <td style={{ color: '#6B7280', fontVariantNumeric: 'tabular-nums' }}>{formatDate(complaint.createdAt)}</td>
                      <td>
                        <div className="table-actions">
                          <button className="action-btn" onClick={() => setSelectedComplaint(complaint)}>View</button>
                          <select
                            className="status-select"
                            value={complaint.status || 'not_resolved'}
                            disabled={updatingStatusId === complaint.id}
                            onChange={(event) => updateComplaintStatus(complaint.id, event.target.value)}
                            aria-label="Update complaint status"
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status.value} value={status.value}>{status.label}</option>
                            ))}
                          </select>
                        </div>
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
                  <span className="result-pill">{selectedComplaint.inputType || 'text'}</span>
                  <span className="result-pill">{selectedComplaint.concernedAuthority || 'Tourism Complaint Cell'}</span>
                  <span className={`badge ${statusClass(selectedComplaint.status)}`}>
                    {statusLabel(selectedComplaint.status)}
                  </span>
                  <span className={`badge ${selectedComplaint.notificationEmailSent ? 'resolved' : 'pending'}`}>
                    {selectedComplaint.notificationEmailSent ? 'Email Sent' : 'Email Pending'}
                  </span>
                </div>
                <div className="status-actions">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status.value}
                      type="button"
                      className={selectedComplaint.status === status.value ? 'status-btn active' : 'status-btn'}
                      disabled={updatingStatusId === selectedComplaint.id}
                      onClick={() => updateComplaintStatus(selectedComplaint.id, status.value)}
                    >
                      {status.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="status-btn"
                    disabled={sendingEmailId === selectedComplaint.id}
                    onClick={() => sendNotificationEmail(selectedComplaint.id)}
                  >
                    {sendingEmailId === selectedComplaint.id ? 'Sending Email...' : 'Send Email'}
                  </button>
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
                    <h4>Concerned Authority</h4>
                    <p>{selectedComplaint.concernedAuthority || 'Tourism Complaint Cell'}</p>
                  </div>
                  <div>
                    <h4>Authority Email</h4>
                    <p>{selectedComplaint.concernedAuthorityEmail || 'Not configured'}</p>
                  </div>
                  <div>
                    <h4>Location</h4>
                    <p>{selectedComplaint.location || 'Not provided'}</p>
                  </div>
                  <div>
                    <h4>Nationality</h4>
                    <p>{selectedComplaint.touristNationality || 'Not provided'}</p>
                  </div>
                </div>
                {selectedComplaint.photoBase64 && (
                  <div>
                    <h4>Attached Photo</h4>
                    <img
                      className="complaint-photo"
                      src={`data:${selectedComplaint.photoMimeType || 'image/jpeg'};base64,${selectedComplaint.photoBase64}`}
                      alt={selectedComplaint.photoFileName || 'Complaint attachment'}
                    />
                  </div>
                )}
                {!selectedComplaint.notificationEmailSent && selectedComplaint.notificationEmailError && (
                  <div className="alert alert-error" role="alert">
                    Email notification issue: {selectedComplaint.notificationEmailError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default AuthorityPage;
