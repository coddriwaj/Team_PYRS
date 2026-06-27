import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function PublicPage() {
  const navigate = useNavigate();
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [formData, setFormData] = useState({
    touristNationality: '',
    location: '',
  });

  useEffect(() => {
    const userRole = sessionStorage.getItem('userRole');
    if (userRole !== 'user') {
      navigate('/login');
      return;
    }

    const stored = sessionStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // Ignore malformed session data.
      }
    }
  }, [navigate]);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, [audioUrl]);

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userRole');
    navigate('/login');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const startRecording = async () => {
    setError('');
    setMessage('');
    setResult(null);

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = new MediaRecorder(stream, preferredMimeType ? { mimeType: preferredMimeType } : undefined);
      chunksRef.current = [];
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      setError(err.message || 'Microphone permission was denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl('');
    setResult(null);
    setMessage('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!audioBlob) {
      setError('Record an audio complaint before submitting.');
      return;
    }

    setProcessing(true);
    try {
      const audioBase64 = await blobToBase64(audioBlob);
      const res = await fetch('/api/gemini/transcribe-classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType: audioBlob.type || 'audio/webm',
          touristName: user?.name || 'Anonymous',
          touristNationality: formData.touristNationality,
          location: formData.location,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gemini processing failed.');
      setResult(data);
      setMessage('Audio complaint processed and submitted successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <p className="eyebrow">Tourist Dashboard</p>
          <h1>Tourism Complaint Management System</h1>
        </div>
        <nav className="topnav" aria-label="Primary">
          <Link to="/">Home</Link>
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
          <p className="eyebrow">AI Audio Complaint</p>
          <h2>Record, transcribe, and classify your tourism issue</h2>
          <p>Speak in any language. Gemini will transcribe, translate, summarize, and classify the complaint.</p>
        </div>

        <div className="public-grid">
          <div className="card">
            <div className="section-label">
              <p className="eyebrow">Recorder</p>
              <h3>Capture your complaint audio</h3>
            </div>

            <form className="complaint-form" onSubmit={handleSubmit}>
              <div className={`recorder-panel ${recording ? 'is-recording' : ''}`}>
                <div className="recording-status">
                  <span className="recording-dot" aria-hidden="true" />
                  <strong>{recording ? 'Recording in progress' : audioBlob ? 'Recording ready' : 'Ready to record'}</strong>
                </div>
                <div className="recorder-actions">
                  {!recording ? (
                    <button type="button" className="btn-primary" onClick={startRecording} disabled={processing}>
                      Start Recording
                    </button>
                  ) : (
                    <button type="button" className="btn-danger-ghost" onClick={stopRecording}>
                      Stop Recording
                    </button>
                  )}
                  <button type="button" className="btn-secondary" onClick={resetRecording} disabled={recording || processing || !audioBlob}>
                    Reset
                  </button>
                </div>
                {audioUrl && (
                  <audio className="audio-preview" controls src={audioUrl}>
                    <track kind="captions" />
                  </audio>
                )}
              </div>

              <div className="field">
                <label htmlFor="touristNationality">Nationality</label>
                <input
                  id="touristNationality"
                  type="text"
                  name="touristNationality"
                  placeholder="Optional"
                  value={formData.touristNationality}
                  onChange={handleChange}
                  disabled={processing}
                />
              </div>

              <div className="field">
                <label htmlFor="location">Location</label>
                <input
                  id="location"
                  type="text"
                  name="location"
                  placeholder="Where did this happen?"
                  value={formData.location}
                  onChange={handleChange}
                  disabled={processing}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }} disabled={recording || processing || !audioBlob}>
                {processing ? 'Processing with Gemini...' : 'Transcribe and Classify'}
              </button>
            </form>

            {error && <p className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</p>}
            {message && <p className="success-note">{message}</p>}
          </div>

          <div className="card result-card">
            <div className="section-label">
              <p className="eyebrow">Gemini Result</p>
              <h3>Transcript and classification</h3>
            </div>

            {!result ? (
              <div className="empty-result">
                <p>Your Gemini transcript, English translation, summary, and complaint category will appear here after processing.</p>
              </div>
            ) : (
              <div className="result-stack">
                <div className="result-meta">
                  <span className={`badge ${result.criticalness}`}>{result.criticalness} priority</span>
                  <span className="result-pill">{result.category}</span>
                  <span className="result-pill">{result.detectedLanguage}</span>
                </div>
                <div>
                  <h4>Original transcript</h4>
                  <p>{result.originalTranscript || 'No transcript returned.'}</p>
                </div>
                <div>
                  <h4>English translation</h4>
                  <p>{result.translatedText || 'No translation returned.'}</p>
                </div>
                <div>
                  <h4>Summary</h4>
                  <p>{result.summary || 'No summary returned.'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default PublicPage;
