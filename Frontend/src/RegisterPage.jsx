import { Link } from 'react-router-dom';

function RegisterPage() {
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
            <Link to="/login">Login</Link>
          </nav>
        </header>

        <main className="auth-main">
          <section className="card login-card" aria-labelledby="register-title">
            <div className="section-heading">
              <p className="eyebrow">Create Account</p>
              <h3 id="register-title">Register for tourism complaint portal access</h3>
            </div>

            <form className="login-form">
              <label>
                Full Name
                <input type="text" name="name" placeholder="Enter your full name" />
              </label>
              <label>
                Email
                <input type="email" name="email" placeholder="Enter your email" />
              </label>
              <label>
                Password
                <input type="password" name="password" placeholder="Create your password" />
              </label>

              <button type="submit" className="primary-btn login-button">
                Register
              </button>
            </form>

            <p className="auth-switch-row">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

export default RegisterPage;
