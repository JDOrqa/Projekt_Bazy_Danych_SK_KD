// Plik: pages/LakeDetail.js
// Wyświetla szczegółowe informacje o łowisku oraz mapę z jego granicami.
// Dostępne dla wszystkich zalogowanych użytkowników.
// Przyciski edycji/usuwania widoczne tylko dla właściciela lub admina.

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';

function LakeDetail() {
    const { id } = useParams();          // Pobranie ID łowiska z adresu URL
    const navigate = useNavigate();
    const { accessToken, user } = useAuth();  // Token i dane użytkownika z kontekstu
    const [lake, setLake] = useState(null);   // Przechowuje dane łowiska
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pobranie danych łowiska z API przy montowaniu komponentu lub zmianie ID
    useEffect(() => {
        const fetchLake = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/lakes/${id}`, {
                    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
                });
                setLake(response.data);
                setError(null);
            } catch (err) {
                console.error('Błąd pobierania łowiska:', err);
                setError('Nie udało się pobrać danych łowiska.');
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchLake();
    }, [id, accessToken]);

    // Sprawdzenie, czy użytkownik może edytować lub usuwać (Admin lub właściciel)
    const canEdit = user && (
        user.roles?.includes('Admin') ||
        (user.roles?.includes('Właściciel') && user.id === lake?.wlasciciel_id)
    );

    // Obsługa usuwania łowiska
    const handleDelete = async () => {
        if (!window.confirm('Czy na pewno chcesz usunąć to łowisko? Operacja jest nieodwracalna.')) return;
        try {
            await axios.delete(`${process.env.REACT_APP_API_URL}/api/lakes/${id}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            navigate('/lakes');   // Po usunięciu wracamy do listy
        } catch (err) {
            alert('Błąd usuwania: ' + (err.response?.data?.detail || err.message));
        }
    };

    if (loading) {
        return <div className="container mt-4 text-center">Ładowanie danych łowiska...</div>;
    }

    if (error || !lake) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">{error || 'Łowisko nie istnieje.'}</div>
                <button className="btn btn-secondary" onClick={() => navigate('/lakes')}>Powrót do listy</button>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            {/* Przycisk powrotu */}
            <button className="btn btn-outline-secondary mb-3" onClick={() => navigate('/lakes')}>
                ← Powrót do listy łowisk
            </button>

            {/* Karta z danymi ogólnymi */}
            <div className="card mb-4">
                <div className="card-body">
                    <h2 className="card-title">{lake.nazwa}</h2>
                    <p className="text-muted">Typ: {lake.typ || 'nieokreślony'}</p>
                    <hr />
                    <div className="row">
                        <div className="col-md-6">
                            <p><strong>Powierzchnia:</strong> {lake.powierzchnia_ha ?? 'brak'} ha</p>
                            <p><strong>Maksymalna głębokość:</strong> {lake.glebokosc_max ?? 'brak'} m</p>
                        </div>
                        <div className="col-md-6">
                            <p><strong>Właściciel ID:</strong> {lake.wlasciciel_id}</p>
                            <p><strong>Data utworzenia:</strong> {new Date(lake.created_at).toLocaleDateString('pl-PL')}</p>
                        </div>
                    </div>
                    <p><strong>Opis:</strong> {lake.opis || 'Brak opisu.'}</p>

                    {/* Przyciski akcji dla uprawnionych */}
                    {canEdit && (
                        <div className="mt-3">
                            <button
                                className="btn btn-warning me-2"
                                onClick={() => navigate(`/lakes/${id}/edit`)}
                            >
                                Edytuj łowisko
                            </button>
                            <button className="btn btn-danger" onClick={handleDelete}>
                                Usuń łowisko
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Karta z mapą – wyświetlenie granic (tryb tylko do odczytu) */}
            <div className="card">
                <div className="card-body">
                    <h4>Granice łowiska na mapie</h4>
                    {lake.granice && lake.granice.length > 0 ? (
                        <MapComponent
                            initialPolygonCoords={lake.granice}
                            readonly={true}
                            onPolygonChange={() => { }}   // brak potrzeby edycji w podglądzie
                        />
                    ) : (
                        <div className="alert alert-info">To łowisko nie ma jeszcze zaznaczonych granic.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LakeDetail;