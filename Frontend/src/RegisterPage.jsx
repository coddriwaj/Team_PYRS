import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function RegisterPage() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      setSuccess(data.message || 'Account created! Redirecting to login…');
      setFormData({ name: '', email: '', password: '' });
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <p className="eyebrow">Government of Nepal</p>
          <h1>Tourism Complaint Management System</h1>
        </div>
        <nav className="topnav" aria-label="Primary">
          <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', padding: '0.4rem 0.75rem', borderRadius: '6px' }}>
            ← Home
          </Link>
          <Link to="/login" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', padding: '0.4rem 0.75rem', borderRadius: '6px' }}>
            Sign In
          </Link>
        </nav>
      </header>

      <div className="auth-main">
        <div className="auth-card">
          <div className="section-label">
            <p className="eyebrow">Create Account</p>
            <h3>Register for portal access</h3>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.15rem' }}>
              Open to tourists, guides, operators, and field staff.
            </p>
          </div>

          {error   && <div className="alert alert-error"   role="alert">{error}</div>}
          {success && <div className="alert alert-success" role="status">{success}</div>}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="Your full name"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
                autoComplete="name"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                autoComplete="new-password"
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <hr className="auth-divider" />
          <p className="auth-switch">Already have an account? <Link to="/login">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;