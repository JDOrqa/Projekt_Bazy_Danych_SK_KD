// Plik: frontend/src/components/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold fs-4" to="/dashboard">
          🎣 Wędkarz
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item"><Link className="nav-link" to="/dashboard">Dashboard</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/lakes">Łowiska</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/iot">Stacje IoT</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/new-catch">Nowy połów</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/catches">Historia</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/gatunki">Gatunki</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/userinfo">Mój profil</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/limits">Limity</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/zarybienia">Zarybienia</Link></li>
            {user.roles?.includes('Admin') && (
              <li className="nav-item"><Link className="nav-link" to="/admin">Admin</Link></li>
            )}
          </ul>
          <span className="navbar-text me-3 text-light">
            👤 {user.imie}
          </span>
          <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
            Wyloguj
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;