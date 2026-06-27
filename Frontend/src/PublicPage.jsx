import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GoogleComplaintMap from './GoogleComplaintMap';

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
  const [photo, setPhoto] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [submissionMode, setSubmissionMode] = useState('audio');
  const [locationInfo, setLocationInfo] = useState({
    status: 'pending',
    value: '',
    display: 'Detecting location...',
    position: null,
  });
  const [formData, setFormData] = useState({
    complaintText: '',
    touristNationality: '',
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
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, [audioUrl, photoPreviewUrl]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationInfo({
        status: 'error',
        value: '',
        display: 'Location tracking is not supported by this browser.',
        position: null,
      });
      return;
    }

    setLocationInfo({
      status: 'pending',
      value: '',
      display: 'Detecting location...',
      position: null,
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const fixedLat = latitude.toFixed(6);
        const fixedLng = longitude.toFixed(6);
        setLocationInfo({
          status: 'ready',
          value: `${fixedLat}, ${fixedLng}`,
          display: `${fixedLat}, ${fixedLng} (${Math.round(accuracy)}m accuracy)`,
          position: { lat: latitude, lng: longitude },
        });
      },
      (geoError) => {
        setLocationInfo({
          status: 'error',
          value: '',
          display: geoError.message || 'Location permission was denied.',
          position: null,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  useEffect(() => {
    detectLocation();
  }, []);

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

  const buildPhotoPayload = async () => {
    if (!photo) return {};

    return {
      photoBase64: await blobToBase64(photo),
      photoMimeType: photo.type,
      photoFileName: photo.name,
    };
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    setError('');

    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);

    if (!file) {
      setPhoto(null);
      setPhotoPreviewUrl('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setPhoto(null);
      setPhotoPreviewUrl('');
      setError('Please attach an image file.');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setPhoto(null);
      setPhotoPreviewUrl('');
      setError('Photo must be 4MB or smaller.');
      return;
    }

    setPhoto(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhoto(null);
    setPhotoPreviewUrl('');
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl('');
    setMessage('');
    setError('');
  };

  const buildSubmissionMessage = (data, fallbackMessage) => {
    const complaint = data.complaint;
    const baseMessage = data.message || fallbackMessage;
    if (/email|notification|routed/i.test(baseMessage)) return baseMessage;
    if (!complaint) return data.message || fallbackMessage;

    const authority = complaint.concernedAuthority || 'Tourism Complaint Cell';
    if (complaint.notificationEmailSent) {
      return `${baseMessage} Email sent to ${authority}.`;
    }

    return `${baseMessage} Routed to ${authority}, but email is pending: ${complaint.notificationEmailError || 'SMTP or authority email configuration needs attention.'}`;
  };

  const submitAudioComplaint = async () => {
    const audioBase64 = await blobToBase64(audioBlob);
    const photoPayload = await buildPhotoPayload();
    const res = await fetch('/api/gemini/transcribe-classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64,
        mimeType: audioBlob.type || 'audio/webm',
        touristName: user?.name || 'Anonymous',
        touristNationality: formData.touristNationality,
        location: locationInfo.value,
        ...photoPayload,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gemini audio processing failed.');
    resetRecording();
    clearPhoto();
    return buildSubmissionMessage(data, 'Audio complaint processed and submitted successfully.');
  };

  const submitTextComplaint = async () => {
    const photoPayload = await buildPhotoPayload();
    const res = await fetch('/api/gemini/classify-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: formData.complaintText,
        touristName: user?.name || 'Anonymous',
        touristNationality: formData.touristNationality,
        location: locationInfo.value,
        ...photoPayload,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gemini text classification failed.');
    setFormData((prev) => ({ ...prev, complaintText: '' }));
    clearPhoto();
    return buildSubmissionMessage(data, 'Text complaint submitted successfully.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (submissionMode === 'audio' && !audioBlob) {
      setError('Record an audio complaint before submitting.');
      return;
    }

    if (submissionMode === 'text' && !formData.complaintText.trim()) {
      setError('Write your complaint before submitting.');
      return;
    }

    setProcessing(true);
    try {
      const successMessage = submissionMode === 'audio'
        ? await submitAudioComplaint()
        : await submitTextComplaint();
      setMessage(successMessage);
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
          <p className="eyebrow">AI Complaint Intake</p>
          <h2>Record or write your tourism issue</h2>
          <p>Submit in any language. Gemini will translate, summarize, categorize, and route the complaint to officials.</p>
        </div>

        <div className="public-grid">
          <div className="card">
            <div className="section-label">
              <p className="eyebrow">Complaint Input</p>
              <h3>Choose audio or text</h3>
            </div>

            <form className="complaint-form" onSubmit={handleSubmit}>
              <div className="mode-tabs" role="tablist" aria-label="Complaint input type">
                <button
                  type="button"
                  className={submissionMode === 'audio' ? 'mode-tab active' : 'mode-tab'}
                  onClick={() => setSubmissionMode('audio')}
                  disabled={processing || recording}
                >
                  Audio
                </button>
                <button
                  type="button"
                  className={submissionMode === 'text' ? 'mode-tab active' : 'mode-tab'}
                  onClick={() => setSubmissionMode('text')}
                  disabled={processing || recording}
                >
                  Text
                </button>
              </div>

              {submissionMode === 'audio' ? (
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
              ) : (
                <div className="field">
                  <label htmlFor="complaintText">Complaint Details</label>
                  <textarea
                    id="complaintText"
                    name="complaintText"
                    rows="7"
                    placeholder="Write your issue in any language."
                    value={formData.complaintText}
                    onChange={handleChange}
                    disabled={processing}
                  />
                </div>
              )}

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
                <label htmlFor="complaintPhoto">
                  Attach Photo <span style={{ color: '#8A9099', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  id="complaintPhoto"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={processing}
                />
                {photoPreviewUrl && (
                  <div className="photo-preview">
                    <img src={photoPreviewUrl} alt="Attached complaint evidence preview" />
                    <button type="button" className="action-btn" onClick={clearPhoto} disabled={processing}>
                      Remove Photo
                    </button>
                  </div>
                )}
              </div>

              <div className="field">
                <label>Location</label>
                <div className={`location-panel ${locationInfo.status}`}>
                  <span>{locationInfo.display}</span>
                  <button type="button" className="action-btn" onClick={detectLocation} disabled={processing}>
                    Retry
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ alignSelf: 'flex-start' }}
                disabled={recording || processing || (submissionMode === 'audio' ? !audioBlob : !formData.complaintText.trim())}
              >
                {processing ? 'Submitting...' : submissionMode === 'audio' ? 'Submit Audio Complaint' : 'Submit Text Complaint'}
              </button>
            </form>

            {error && <p className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</p>}
            {message && <p className="success-note">{message}</p>}
          </div>

          <div className="card public-map-card">
            <div className="section-label">
              <p className="eyebrow">Detected Location</p>
              <h3>Complaint location preview</h3>
            </div>
            <div className="mini-map-card">
              <GoogleComplaintMap
                markers={locationInfo.position ? [{
                  id: 'current-location',
                  title: 'Your current location',
                  category: 'Complaint origin',
                  criticalness: 'medium',
                  position: locationInfo.position,
                }] : []}
                emptyMessage="Allow location permission to preview your complaint location."
              />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default PublicPage;
