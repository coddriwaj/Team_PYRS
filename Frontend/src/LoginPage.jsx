import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function LoginPage() {
  const [formData, setFormData] = useState({ usernameOrEmail: '', password: '', remember: false });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.usernameOrEmail, password: formData.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      const user = data.user;
      sessionStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('userRole', user.role);
      setSuccess(data.message || 'Signed in successfully.');
      setTimeout(() => navigate(user.role === 'official' ? '/authority' : '/public'), 1200);
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
          <Link to="/" className="topnav-link" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', padding: '0.4rem 0.75rem', borderRadius: '6px' }}>
            ← Back to Home
          </Link>
        </nav>
      </header>

      <div className="auth-main">
        <div className="auth-card">
          <div className="section-label">
            <p className="eyebrow">Secure Login</p>
            <h3>Sign in to your portal account</h3>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.15rem' }}>
              For tourists, tourism officials, and field staff.
            </p>
          </div>

          {error   && <div className="alert alert-error"   role="alert">{error}</div>}
          {success && <div className="alert alert-success" role="status">{success}</div>}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="usernameOrEmail">Email or Username</label>
              <input
                id="usernameOrEmail"
                type="text"
                name="usernameOrEmail"
                placeholder="you@example.com"
                value={formData.usernameOrEmail}
                onChange={handleChange}
                disabled={loading}
                autoComplete="username"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="auth-row">
              <label className="remember-label">
                <input type="checkbox" name="remember" checked={formData.remember} onChange={handleChange} disabled={loading} />
                Remember me
              </label>
              <a href="#forgot" className="forgot-link">Forgot password?</a>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}>
              {loading ? 'Signing in…' : 'Sign In to Dashboard'}
            </button>
          </form>

          <hr className="auth-divider" />
          <p className="auth-switch">New user? <Link to="/register">Create an account</Link></p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;