// Importy React, hooków i kontekstu autoryzacji
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Userinfo = () => {
    const { user, refreshUser } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        imie: '',
        nazwisko: '',
        nr_licencji: ''
    });

    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // 🔐 REFY DO HASEŁ (NIE W STATE)
    const oldPasswordRef = useRef();
    const newPasswordRef = useRef();
    const confirmPasswordRef = useRef();

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

    const showError = (text) => {
        setMessage(text);
        setMessageType('error');
    };

    const showSuccess = (text) => {
        setMessage(text);
        setMessageType('success');
    };

    const handleProfileChange = (event) => {
        setFormData({ ...formData, [event.target.name]: event.target.value });
    };

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

    // 🔐 ZMIANA HASŁA (BEZ STATE)
    const changePassword = async (event) => {
        event.preventDefault();
        setMessage('');

        const payload = {
            old_password: oldPasswordRef.current?.value || '',
            new_password: newPasswordRef.current?.value || '',
            confirm_password: confirmPasswordRef.current?.value || ''
        };

        if (!payload.old_password || !payload.new_password || !payload.confirm_password) {
            showError('Wszystkie pola hasła muszą być wypełnione.');
            return;
        }

        if (payload.new_password !== payload.confirm_password) {
            showError('Hasła muszą być takie same.');
            return;
        }

        if (payload.new_password.length < 8) {
            showError('Hasło musi mieć min. 8 znaków.');
            return;
        }

        if (!/\d/.test(payload.new_password)) {
            showError('Hasło musi zawierać cyfrę.');
            return;
        }

        if (!/[a-zA-Z]/.test(payload.new_password)) {
            showError('Hasło musi zawierać literę.');
            return;
        }

        try {
            await api.post('/api/users/change-password', payload);

            // reset pól
            oldPasswordRef.current.value = '';
            newPasswordRef.current.value = '';
            confirmPasswordRef.current.value = '';

            showSuccess('Hasło zmieniono.');
        } catch (error) {
            showError(error.response?.data?.detail || 'Błąd zmiany hasła.');
        }
    };

    if (loading) {
        return <div className="text-center mt-5">Ładowanie...</div>;
    }

    return (
        <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">

                {/* PROFIL */}
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
                                <p><b>Email:</b> {formData.email || '–'}</p>
                                <p><b>Imię:</b> {formData.imie || '–'}</p>
                                <p><b>Nazwisko:</b> {formData.nazwisko || '–'}</p>
                                <p><b>Licencja:</b> {formData.nr_licencji || '–'}</p>

                                <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                                    Edytuj dane
                                </button>
                            </>
                        ) : (
                            <form onSubmit={saveProfile}>
                                <input type="email" name="email" value={formData.email} onChange={handleProfileChange} className="form-control mb-2" />
                                <input type="text" name="imie" value={formData.imie} onChange={handleProfileChange} className="form-control mb-2" />
                                <input type="text" name="nazwisko" value={formData.nazwisko} onChange={handleProfileChange} className="form-control mb-2" />
                                <input type="text" name="nr_licencji" value={formData.nr_licencji} onChange={handleProfileChange} className="form-control mb-2" />

                                <button className="btn btn-success" type="submit">Zapisz</button>
                                <button type="button" className="btn btn-secondary ms-2" onClick={cancelEdit}>Anuluj</button>
                            </form>
                        )}
                    </div>
                </div>

                {/* HASŁO */}
                <div className="card shadow-sm">
                    <div className="card-header bg-secondary text-white">
                        <h4 className="mb-0">Zmiana hasła</h4>
                    </div>

                    <div className="card-body">
                        <form onSubmit={changePassword} autoComplete="off">

                            <input
                                type="password"
                                ref={oldPasswordRef}
                                className="form-control mb-2"
                                placeholder="Stare hasło"
                                autoComplete="current-password"
                            />

                            <input
                                type="password"
                                ref={newPasswordRef}
                                className="form-control mb-2"
                                placeholder="Nowe hasło"
                                autoComplete="new-password"
                            />

                            <input
                                type="password"
                                ref={confirmPasswordRef}
                                className="form-control mb-2"
                                placeholder="Potwierdź nowe hasło"
                                autoComplete="new-password"
                            />

                            <button className="btn btn-warning" type="submit">
                                Zmień hasło
                            </button>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Userinfo;