import { Link } from 'react-router-dom';

function LoginPage() {
  return (
    <div className="auth-shell">
      <div className="page-shell auth-page">
        <header className="topbar auth-topbar">
          <div>
            <p className="eyebrow">Government of Nepal</p>
            <h1>Tourism Complaint Management System</h1>
          </div>
          <nav className="topnav" aria-label="Primary">
            <Link to="/">Home</Link>
          </nav>
        </header>

        <main className="auth-main">
          <section className="card login-card" aria-labelledby="login-title">
            <div className="section-heading">
              <p className="eyebrow">Secure Login</p>
              <h3 id="login-title">Portal access for tourists and tourism officials</h3>
            </div>

            <form className="login-form">
              <label>
                Email or Username
                <input type="text" name="username" placeholder="Enter your username" />
              </label>
              <label>
                Password
                <input type="password" name="password" placeholder="Enter your password" />
              </label>

              <div className="login-row">
                <label className="remember">
                  <input type="checkbox" name="remember" />
                  Remember me
                </label>
                <a href="#forgot">Forgot password?</a>
              </div>

              <button type="submit" className="primary-btn login-button">
                Sign In to Dashboard
              </button>
            </form>

            <p className="login-note">
              Designed for tourism complaint intake, review, and department-level response management.
            </p>
            <p className="auth-switch-row">
              New user? <Link to="/register">Register</Link>
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

export default LoginPage;
