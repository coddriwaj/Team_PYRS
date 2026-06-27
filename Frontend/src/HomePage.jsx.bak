import { Link } from 'react-router-dom';

const complaintChannels = [
  {
    title: 'Tourist Complaint Submission',
    text: 'Register issues related to hotels, guides, transport, pricing, or travel services.',
  },
  {
    title: 'AI Complaint Segregation',
    text: 'Let the AI model separate the complaint into categories like hotel, transport, safety, or service.',
  },
  {
    title: 'Official Portal Summary',
    text: 'Summarized and translated English complaints appear in the official portal for quick action.',
  },
];

const highlights = [
  'Tourist complaint registration',
  'Tourism office resolution tracking',
  'Secure visitor and official login',
  'Escalation and response alerts',
];

const monthlyComplaintStats = [
  { label: 'Received', value: '1,248', note: 'New tourism complaints registered this month' },
  { label: 'Resolved', value: '972', note: 'Tourism complaints fully closed and verified' },
  { label: 'In Process', value: '214', note: 'Tourism complaints currently under review' },
];

const aiWorkflow = [
  {
    title: '1. File Complaint',
    text: 'Tourists can submit text or voice complaints in any language from the complaint section.',
  },
  {
    title: '2. AI Processing',
    text: 'The AI model segregates the complaint into different issues and generates a concise summary.',
  },
  {
    title: '3. Official Portal',
    text: 'The complaint is translated into English so officials can review it in the portal.',
  },
];

function HomePage() {
  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Government of Nepal</p>
          <h1>Tourism Complaint Management System</h1>
        </div>
        <nav className="topnav" aria-label="Primary">
          <a href="#overview">Overview</a>
          <a href="#services">Services</a>
          <Link to="/login">Login</Link>
        </nav>
      </header>

      <main className="layout">
        <section className="hero card">
          <div className="hero-copy">
            <p className="eyebrow">Report. Track. Resolve.</p>
            <h2>A modern government portal for tourism complaint management in Nepal.</h2>
            <p className="lead">
              Tourists and service providers can submit complaints, officials can track
              assignments, and tourism departments can resolve issues with a clear, transparent
              workflow.
            </p>

            <div className="hero-actions">
              <Link className="primary-btn" to="/login">Access Portal</Link>
              <a className="secondary-btn" href="#overview">View Overview</a>
            </div>

            <div className="highlight-list" id="services">
              {highlights.map((item) => (
                <div key={item} className="highlight-item">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <aside className="stats-panel">
            <div className="stat-box">
              <span>24/7</span>
              <p>Complaint intake for tourists, operators, officers, and field staff</p>
            </div>
            <div className="stat-box">
              <span>Multi-step</span>
              <p>Registration, assignment, review, and resolution workflow for tourism cases</p>
            </div>
            <div className="stat-box">
              <span>Tracked</span>
              <p>Escalations, deadlines, and status changes in one tourism portal</p>
            </div>
          </aside>
        </section>

        <section className="card monthly-summary">
          <div className="section-heading">
            <p className="eyebrow">Monthly Complaint Summary</p>
            <h3>Tourism complaints received, resolved, and still in process this month</h3>
          </div>

          <div className="monthly-grid">
            {monthlyComplaintStats.map((item) => (
              <article key={item.label} className="monthly-card">
                <p className="monthly-label">{item.label}</p>
                <strong className="monthly-value">{item.value}</strong>
                <span className="monthly-note">{item.note}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="card workflow-section">
          <div className="section-heading">
            <p className="eyebrow">Complaint Section Workflow</p>
            <h3>How tourist complaints move from submission to the official portal</h3>
          </div>

          <div className="workflow-grid">
            {aiWorkflow.map((item) => (
              <article key={item.title} className="workflow-card">
                <h4>{item.title}</h4>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="content-grid" id="overview">
          <div className="card section-card">
            <div className="section-heading">
              <p className="eyebrow">Core Services</p>
              <h3>Built around complaint handling</h3>
            </div>

            <div className="destination-grid">
              {complaintChannels.map((channel) => (
                <article key={channel.title} className="destination-card">
                  <h4>{channel.title}</h4>
                  <p>{channel.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
