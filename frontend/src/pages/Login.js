// Plik: frontend/src/pages/Login.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.detail || 'Nieprawidłowy login lub hasło');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row justify-content-center mt-5">
      <div className="col-md-5 col-lg-4">
        <div className="card shadow-lg border-0">
          <div className="card-body p-4">
            <div className="text-center mb-4">
              <h2 className="fw-bold">🎣 Wędkarz</h2>
              <p className="text-muted">Zaloguj się do swojego konta</p>
            </div>
            
            {error && (
              <div className="alert alert-danger py-2 text-center">{error}</div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-3">
                <label className="form-label">Hasło</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <button
                type="submit"
                className="btn btn-primary w-100 mb-3"
                disabled={loading}
              >
                {loading ? 'Logowanie...' : 'Zaloguj się'}
              </button>
              
              <div className="text-center">
                <span className="text-muted">Nie masz konta? </span>
                <Link to="/register">Zarejestruj się</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;