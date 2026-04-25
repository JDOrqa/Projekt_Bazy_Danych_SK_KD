// frontend/src/pages/NewVisit.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import MapPicker from '../components/MapPicker';

function NewVisit() {
    const navigate = useNavigate();
    const [lakes, setLakes] = useState([]);
    const [formData, setFormData] = useState({
        lowisko_id: '',
        data_wizyty: '',
        lokalizacja_przybycia: null,
        uwagi: '',
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        const fetchLakes = async () => {
            try {
                const res = await api.get('/api/lakes');
                setLakes(res.data);
            } catch (err) {
                console.error('Błąd pobierania łowisk:', err);
            }
        };
        fetchLakes();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLocationSelect = (coords) => {
        setFormData(prev => ({ ...prev, lokalizacja_przybycia: coords }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        if (!formData.lowisko_id) {
            setMessage({ text: 'Wybierz łowisko.', type: 'error' });
            setLoading(false);
            return;
        }

        const payload = {
            lowisko_id: parseInt(formData.lowisko_id),
            data_wizyty: formData.data_wizyty ? new Date(formData.data_wizyty).toISOString() : null,
            uwagi: formData.uwagi || null,
            lokalizacja_przybycia: formData.lokalizacja_przybycia || null,
        };

        try {
            await api.post('/api/visits/', payload);
            setMessage({ text: 'Wizyta została zarejestrowana!', type: 'success' });
            setTimeout(() => navigate('/visits'), 2000);
        } catch (err) {
            console.error(err);
            setMessage({ text: err.response?.data?.detail || 'Błąd rejestracji wizyty.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <h2>Rejestracja wizyty na łowisku</h2>
            {message.text && (
                <div className={`alert alert-${message.type === 'error' ? 'danger' : 'success'}`}>
                    {message.text}
                </div>
            )}
            <form onSubmit={handleSubmit} className="card p-4">
                <div className="mb-3">
                    <label className="form-label">Łowisko *</label>
                    <select
                        name="lowisko_id"
                        className="form-select"
                        value={formData.lowisko_id}
                        onChange={handleChange}
                        required
                    >
                        <option value="">-- Wybierz łowisko --</option>
                        {lakes.map(lake => (
                            <option key={lake.id} value={lake.id}>{lake.nazwa}</option>
                        ))}
                    </select>
                </div>

                <div className="mb-3">
                    <label className="form-label">Data wizyty (opcjonalnie)</label>
                    <input
                        type="datetime-local"
                        name="data_wizyty"
                        className="form-control"
                        value={formData.data_wizyty}
                        onChange={handleChange}
                    />
                    <small className="text-muted">Pozostaw puste, aby użyć bieżącej daty i czasu.</small>
                </div>

                <div className="mb-3">
                    <label className="form-label">Lokalizacja przybycia (kliknij na mapie)</label>
                    <MapPicker
                        onLocationSelect={handleLocationSelect}
                        initialLocation={formData.lokalizacja_przybycia}
                    />
                    {formData.lokalizacja_przybycia && (
                        <div className="mt-2">
                            <small className="text-muted">
                                Wybrano: lon={formData.lokalizacja_przybycia[0].toFixed(6)}, lat={formData.lokalizacja_przybycia[1].toFixed(6)}
                            </small>
                        </div>
                    )}
                </div>

                <div className="mb-3">
                    <label className="form-label">Uwagi (opcjonalnie)</label>
                    <textarea
                        name="uwagi"
                        className="form-control"
                        rows="3"
                        value={formData.uwagi}
                        onChange={handleChange}
                    />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Zapisywanie...' : 'Zarejestruj wizytę'}
                </button>
            </form>
        </div>
    );
}

export default NewVisit;