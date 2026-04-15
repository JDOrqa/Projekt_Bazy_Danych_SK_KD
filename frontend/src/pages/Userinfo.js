//Importy React, hooków i kontekstu autoryzacji
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';


const Userinfo = () => {
  //Pobieranie danych użytkownika oraz ustawianie stanu dla formularzy i komunikatów
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState({ email: '', imie: '', nazwisko: '', nr_licencji: '' });
  const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  //Ładowanie danych profilu przy montowaniu komponentu
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/api/users/me');
        setFormData({
          email: data.email || '',
          imie: data.imie || '',
          nazwisko: data.nazwisko || '',
          nr_licencji: data.nr_licencji || ''
        });
      } catch (error) {
        setMessage('Nie można pobrać profilu.');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  //Funkcje pomocnicze do wyświetlania komunikatów
  const showError = (text) => {
    setMessage(text);
    setMessageType('error');
  };

  //Funkcja do wyświetlania komunikatów sukcesu
  const showSuccess = (text) => {
    setMessage(text);
    setMessageType('success');
  };

  //Obsługa zmian w formularzu profilu
  const handleProfileChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  //Obsługa zmian w formularzu zmiany hasła
  const handlePasswordChange = (event) => {
    setPasswordData({ ...passwordData, [event.target.name]: event.target.value });
  };

  //Funkcja do zapisywania zmian w profilu
  const saveProfile = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!formData.email.trim() || !formData.imie.trim() || !formData.nazwisko.trim()) {
      showError('Email, imię i nazwisko są obowiązkowe.');
      return;
    }

    try {
      const { data } = await api.put('/api/users/me', formData);
      setFormData({
        email: data.email || '',
        imie: data.imie || '',
        nazwisko: data.nazwisko || '',
        nr_licencji: data.nr_licencji || ''
      });
      setIsEditing(false);
      showSuccess('Profil zapisano.');
      refreshUser?.();
    } catch (error) {
      showError(error.response?.data?.detail || 'Błąd zapisu profilu.');
    }
  };

  //Funkcja do anulowania edycji i przywracania danych z profilu
  const cancelEdit = () => {
    if (user) {
      setFormData({
        email: user.email || '',
        imie: user.imie || '',
        nazwisko: user.nazwisko || '',
        nr_licencji: user.nr_licencji || ''
      });
    }
    setIsEditing(false);
    setMessage('');
    setMessageType('');
  };

  //Funkcja do zmiany hasła
  const changePassword = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!passwordData.old_password.trim() || !passwordData.new_password.trim() || !passwordData.confirm_password.trim()) {
      showError('Wszystkie pola hasła muszą być wypełnione.');
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      showError('Hasła muszą być takie same.');
      return;
    }
    if (passwordData.new_password.length < 8) {
  showError('Hasło musi mieć min. 8 znaków.');
  return;
}
if (!/\d/.test(passwordData.new_password)) {
  showError('Hasło musi zawierać cyfrę.');
  return;
}
if (!/[a-zA-Z]/.test(passwordData.new_password)) {
  showError('Hasło musi zawierać literę.');
  return;
}

    try {
      await api.post('/api/users/change-password', passwordData);
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
      showSuccess('Hasło zmieniono.');
    } catch (error) {
      showError(error.response?.data?.detail || 'Błąd zmiany hasła.');
    }
  };

  if (loading) {
    return <div className="text-center mt-5">Ładowanie...</div>;
  }

  //Renderowanie formularzy do wyświetlania i edycji profilu oraz zmiany hasła
  return (
    <div className="row justify-content-center">
      <div className="col-md-8 col-lg-6">
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-primary text-white">
            <h4 className="mb-0">Mój profil</h4>
          </div>
          <div className="card-body">
            {message && (
              <div className={messageType === 'error' ? 'alert alert-danger' : 'alert alert-success'}>
                {message}
              </div>
            )}

            {!isEditing ? (
              <>
                <div className="mb-3">
                  <label className="form-label fw-bold">Email</label>
                  <p className="form-control-plaintext">{formData.email || '–'}</p>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Imię</label>
                  <p className="form-control-plaintext">{formData.imie || '–'}</p>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Nazwisko</label>
                  <p className="form-control-plaintext">{formData.nazwisko || '–'}</p>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Numer licencji</label>
                  <p className="form-control-plaintext">{formData.nr_licencji || '–'}</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                  Edytuj dane
                </button>
              </>
            ) : (
              <form onSubmit={saveProfile}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleProfileChange} className="form-control" maxLength={255} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Imię</label>
                  <input type="text" name="imie" value={formData.imie} onChange={handleProfileChange} className="form-control" maxLength={255} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Nazwisko</label>
                  <input type="text" name="nazwisko" value={formData.nazwisko} onChange={handleProfileChange} className="form-control" maxLength={255} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Numer licencji</label>
                  <input type="text" name="nr_licencji" value={formData.nr_licencji} onChange={handleProfileChange} className="form-control" maxLength={255} />
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-success">Zapisz</button>
                  <button type="button" className="btn btn-outline-secondary" onClick={cancelEdit}>Anuluj</button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="card shadow-sm">
          <div className="card-header bg-secondary text-white">
            <h4 className="mb-0">Zmiana hasła</h4>
          </div>
          <div className="card-body">
            <form onSubmit={changePassword}>
              <div className="mb-3">
                <label className="form-label">Stare hasło</label>
                              <input type="password" name="old_password" value={passwordData.old_password} onChange={handlePasswordChange} className="form-control" maxLength={128} />
              </div>
              <div className="mb-3">
                <label className="form-label">Nowe hasło</label>
                              <input type="password" name="new_password" value={passwordData.new_password} onChange={handlePasswordChange} className="form-control" maxLength={128} />
              </div>
              <div className="mb-3">
                <label className="form-label">Potwierdź nowe hasło</label>
                              <input type="password" name="confirm_password" value={passwordData.confirm_password} onChange={handlePasswordChange} className="form-control" maxLength={128} />
              </div>
              <button type="submit" className="btn btn-warning">Zmień hasło</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Userinfo;
