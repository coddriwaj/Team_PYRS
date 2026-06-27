import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function PublicPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [user, setUser]       = useState(null);

  useEffect(() => {
    const userRole = sessionStorage.getItem('userRole');
    if (userRole !== 'user') {
      navigate('/login');
      return;
    }
    const stored = sessionStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userRole');
    navigate('/login');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage('Complaint submitted successfully. The tourism authority will review this issue shortly.');
    e.currentTarget.reset();
  };

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <p className="eyebrow">Tourist Dashboard</p>
          <h1>Tourism Complaint Management System</h1>
        </div>
        <nav className="topnav" aria-label="Primary">
          <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', padding: '0.4rem 0.75rem', borderRadius: '6px' }}>
            Home
          </Link>
          <div className="topnav-divider" />
          {user && (
            <div className="user-chip">
              <div className="user-chip-avatar">{user.name?.[0]?.toUpperCase() ?? 'U'}</div>
              <span className="user-chip-name">{user.name}</span>
            </div>
          )}
          <button className="btn-danger-ghost" onClick={handleLogout}>Logout</button>
        </nav>
      </header>

      <main className="dashboard-layout">
        <div className="dashboard-header">
          <p className="eyebrow">Submit a Complaint</p>
          <h2>Report your tourism issue</h2>
          <p>Describe your experience and our AI system will route it to the right authority.</p>
        </div>

        <div className="card" style={{ maxWidth: 680 }}>
          <div className="section-label">
            <p className="eyebrow">Complaint Form</p>
            <h3>Describe your issue</h3>
          </div>

          <form className="complaint-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="subject">Complaint Subject</label>
              <input id="subject" type="text" name="subject" placeholder="Short title of your issue" required />
            </div>

            <div className="field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.9rem',
                  border: '1.5px solid #D1D8E0',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  color: '#1E2630',
                  background: '#FAFBFC',
                  outline: 'none',
                }}
              >
                <option value="">Select a category</option>
                <option value="hotel">Hotel / Accommodation</option>
                <option value="transport">Transport</option>
                <option value="guide">Tour Guide</option>
                <option value="pricing">Pricing / Overcharging</option>
                <option value="safety">Safety</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="details">Complaint Details</label>
              <textarea
                id="details"
                name="details"
                rows="6"
                placeholder="Describe your problem in detail. You can write in any language."
                required
              />
            </div>

            <div className="field">
              <label htmlFor="audio">
                Attach Audio Complaint <span style={{ color: '#8A9099', fontWeight: 400 }}>(optional)</span>
              </label>
              <input id="audio" type="file" name="audio" accept="audio/*" />
            </div>

            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>
              Submit Complaint
            </button>
          </form>

          {message && <p className="success-note">{message}</p>}
        </div>

        <div className="card" style={{ maxWidth: 680, background: 'rgba(245,240,232,0.6)', border: '1px solid rgba(0,0,0,.06)' }}>
          <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>What happens next?</p>
          <p style={{ fontSize: '0.875rem', color: '#4A5568' }}>
            Your complaint is automatically processed by our AI system — categorised, summarised,
            and translated into English. It is then routed to the appropriate tourism authority who
            will respond within 3–5 working days.
          </p>
        </div>
      </main>
    </div>
  );
}

export default PublicPage;