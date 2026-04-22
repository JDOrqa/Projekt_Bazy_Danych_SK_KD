// Plik: pages/LakeEdit.js
// Formularz edycji istniejącego łowiska.
// Umożliwia zmianę wszystkich pól oraz rysowanie/modyfikację granic na mapie.
// Dostęp tylko dla właściciela lub administratora.

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';

function LakeEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { accessToken, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Stan formularza
    const [formData, setFormData] = useState({
        nazwa: '',
        typ: '',
        powierzchnia_ha: '',
        glebokosc_max: '',
        opis: '',
        granice: []      // tablica współrzędnych [[lng, lat], ...]
    });

    // Pobranie aktualnych danych łowiska do edycji
    useEffect(() => {
        const fetchLake = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/lakes/${id}`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                const data = response.data;
                setFormData({
                    nazwa: data.nazwa || '',
                    typ: data.typ || '',
                    powierzchnia_ha: data.powierzchnia_ha ?? '',
                    glebokosc_max: data.glebokosc_max ?? '',
                    opis: data.opis || '',
                    granice: data.granice || []
                });
            } catch (err) {
                console.error('Błąd pobierania łowiska do edycji:', err);
                setError('Nie udało się załadować danych łowiska.');
            } finally {
                setLoading(false);
            }
        };
        if (id && accessToken) fetchLake();
    }, [id, accessToken]);

    // Obsługa zmian pól tekstowych
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Aktualizacja współrzędnych wielokąta z mapy
    const handlePolygonChange = (coords) => {
        setFormData(prev => ({ ...prev, granice: coords }));
    };

    // Walidacja i wysłanie danych do API
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        // Walidacja
        if (!formData.nazwa.trim()) {
            setError('Nazwa łowiska jest wymagana.');
            setSaving(false);
            return;
        }
        if (formData.powierzchnia_ha && parseFloat(formData.powierzchnia_ha) <= 0) {
            setError('Powierzchnia musi być większa od 0.');
            setSaving(false);
            return;
        }
        if (formData.glebokosc_max && parseFloat(formData.glebokosc_max) <= 0) {
            setError('Głębokość maksymalna musi być większa od 0.');
            setSaving(false);
            return;
        }
        if (formData.granice.length > 0 && formData.granice.length < 3) {
            setError('Granice muszą zawierać co najmniej 3 punkty (aby utworzyć wielokąt).');
            setSaving(false);
            return;
        }

        try {
            const payload = {
                nazwa: formData.nazwa,
                typ: formData.typ || null,
                powierzchnia_ha: formData.powierzchnia_ha ? parseFloat(formData.powierzchnia_ha) : null,
                glebokosc_max: formData.glebokosc_max ? parseFloat(formData.glebokosc_max) : null,
                opis: formData.opis || null,
                granice: formData.granice
            };
            await axios.put(`${process.env.REACT_APP_API_URL}/api/lakes/${id}`, payload, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            navigate(`/lakes/${id}`);   // Po zapisaniu wracamy do szczegółów
        } catch (err) {
            console.error('Błąd aktualizacji:', err);
            setError(err.response?.data?.detail || 'Wystąpił błąd podczas zapisywania zmian.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="container mt-4 text-center">Ładowanie formularza...</div>;

    return (
        <div className="container mt-4">
            {/* Przycisk anulowania i powrotu */}
            <button className="btn btn-outline-secondary mb-3" onClick={() => navigate(`/lakes/${id}`)}>
                ← Anuluj i wróć do szczegółów
            </button>

            <div className="card">
                <div className="card-header">
                    <h3>Edytuj łowisko: {formData.nazwa}</h3>
                </div>
                <div className="card-body">
                    {error && <div className="alert alert-danger">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        {/* Pole: nazwa */}
                        <div className="mb-3">
                            <label className="form-label">Nazwa *</label>
                            <input
                                type="text"
                                className="form-control"
                                name="nazwa"
                                value={formData.nazwa}
                                onChange={handleInputChange}
                                maxLength={255}
                                required
                            />
                        </div>

                        {/* Pole: typ (select) */}
                        <div className="mb-3">
                            <label className="form-label">Typ</label>
                            <select className="form-select" name="typ" value={formData.typ} onChange={handleInputChange}>
                                <option value="">-- Wybierz typ --</option>
                                <option value="jezioro">Jezioro</option>
                                <option value="rzeka">Rzeka</option>
                                <option value="staw">Staw</option>
                                <option value="zalew">Zalew</option>
                            </select>
                        </div>

                        {/* Pole: powierzchnia */}
                        <div className="mb-3">
                            <label className="form-label">Powierzchnia (ha)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-control"
                                name="powierzchnia_ha"
                                value={formData.powierzchnia_ha}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        {/* Pole: głębokość max */}
                        <div className="mb-3">
                            <label className="form-label">Maksymalna głębokość (m)</label>
                            <input
                                type="number"
                                step="0.1"
                                className="form-control"
                                name="glebokosc_max"
                                value={formData.glebokosc_max}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        {/* Pole: opis (textarea) */}
                        <div className="mb-3">
                            <label className="form-label">Opis</label>
                            <textarea
                                className="form-control"
                                rows="3"
                                name="opis"
                                value={formData.opis}
                                onChange={handleInputChange}
                                maxLength={1000}
                            ></textarea>
                        </div>

                        {/* Mapa z możliwością rysowania granic */}
                        <div className="mb-3">
                            <label className="form-label">Granice łowiska (kliknij na mapę, aby narysować wielokąt)</label>
                            <MapComponent
                                initialPolygonCoords={formData.granice}
                                readonly={false}
                                onPolygonChange={handlePolygonChange}
                            />
                            <small className="text-muted">
                                Narysuj wielokąt reprezentujący granice łowiska. Po zakończeniu kliknij "Zapisz zmiany".
                            </small>
                        </div>

                        {/* Przyciski formularza */}
                        <div className="d-flex justify-content-end gap-2">
                            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/lakes/${id}`)}>
                                Anuluj
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default LakeEdit;