import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './HomePage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import PublicPage from './PublicPage';
import AuthorityPage from './AuthorityPage';

function App() {
  return (
    <Routes>
      <Route path="/"          element={<HomePage />} />
      <Route path="/login"     element={<LoginPage />} />
      <Route path="/register"  element={<RegisterPage />} />
      <Route path="/public"    element={<PublicPage />} />
      <Route path="/authority" element={<AuthorityPage />} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;