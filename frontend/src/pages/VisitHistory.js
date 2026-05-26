// Plik: pages/VisitHistory.js
// Wyświetla historię wizyt użytkownika z opcjami filtrowania (łowisko, zakres dat).
// Umożliwia paginację.

import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

function VisitHistory() {
    const [visits, setVisits] = useState([]);
    const [lakes, setLakes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        lowisko_id: '',
        from_date: '',
        to_date: '',
    });
    const [pagination, setPagination] = useState({ skip: 0, limit: 20 });
    const [total, setTotal] = useState(0); // nie mamy total, można pominąć lub dodać osobny endpoint

    // Pobranie listy łowisk do filtra
    useEffect(() => {
        const fetchLakes = async () => {
            try {
                const res = await api.get('/api/lakes');
                setLakes(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchLakes();
    }, []);

    const fetchVisits = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                skip: pagination.skip,
                limit: pagination.limit,
            };
            if (filters.lowisko_id) params.lowisko_id = filters.lowisko_id;
            if (filters.from_date) params.from_date = filters.from_date; // Wyślij bezpośrednio z inputa
            if (filters.to_date) params.to_date = filters.to_date;

            const res = await api.get('/api/visits/', { params });
            setVisits(res.data);
        } catch (err) {
            console.error('Błąd pobierania wizyt:', err);
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.skip, pagination.limit]);

    useEffect(() => {
        fetchVisits();
    }, [fetchVisits]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPagination(prev => ({ ...prev, skip: 0 })); // reset paginacji
    };

    const handlePrevious = () => {
        if (pagination.skip >= pagination.limit) {
            setPagination(prev => ({ ...prev, skip: prev.skip - prev.limit }));
        }
    };

    const handleNext = () => {
        if (visits.length === pagination.limit) {
            setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }));
        }
    };

    const formatDateTime = (dateStr) => {
        return new Date(dateStr).toLocaleString('pl-PL');
    };

    return (
        <div className="container mt-4">
            <h2>Historia wizyt</h2>

            {/* Filtry */}
            <div className="card p-3 mb-4">
                <div className="row g-3">
                    <div className="col-md-4">
                        <label className="form-label">Łowisko</label>
                        <select
                            name="lowisko_id"
                            className="form-select"
                            value={filters.lowisko_id}
                            onChange={handleFilterChange}
                        >
                            <option value="">Wszystkie</option>
                            {lakes.map(lake => (
                                <option key={lake.id} value={lake.id}>{lake.nazwa}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Data od</label>
                        <input
                            type="datetime-local"
                            name="from_date"
                            className="form-control"
                            value={filters.from_date}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Data do</label>
                        <input
                            type="datetime-local"
                            name="to_date"
                            className="form-control"
                            value={filters.to_date}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div className="col-md-2 d-flex align-items-end">
                        <button className="btn btn-secondary w-100" onClick={() => {
                            setFilters({ lowisko_id: '', from_date: '', to_date: '' });
                            setPagination({ skip: 0, limit: 20 });
                        }}>
                            Wyczyść filtry
                        </button>
                    </div>
                </div>
            </div>

            {/* Lista wizyt */}
            {loading ? (
                <div className="text-center">Ładowanie...</div>
            ) : visits.length === 0 ? (
                <div className="alert alert-info">Brak wizyt spełniających kryteria.</div>
            ) : (
                <>
                    <div className="list-group">
                        {visits.map(visit => (
                            <div key={visit.id} className="list-group-item">
                                <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h5 className="mb-1">
                                            {lakes.find(l => l.id === visit.lowisko_id)?.nazwa || `Łowisko #${visit.lowisko_id}`}
                                        </h5>
                                        <p className="mb-1">
                                            <strong>Data wizyty:</strong> {formatDateTime(visit.data_wizyty)}
                                        </p>
                                        {visit.lokalizacja_przybycia && (
                                            <p className="mb-1">
                                                <strong>GPS:</strong> lon={visit.lokalizacja_przybycia[0]}, lat={visit.lokalizacja_przybycia[1]}
                                            </p>
                                        )}
                                        {visit.uwagi && <p className="mb-1"><strong>Uwagi:</strong> {visit.uwagi}</p>}
                                        <small className="text-muted">Zarejestrowano: {formatDateTime(visit.created_at)}</small>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Paginacja */}
                    <div className="d-flex justify-content-between mt-3">
                        <button
                            className="btn btn-outline-secondary"
                            onClick={handlePrevious}
                            disabled={pagination.skip === 0}
                        >
                            &laquo; Poprzednie
                        </button>
                        <span>Strona {Math.floor(pagination.skip / pagination.limit) + 1}</span>
                        <button
                            className="btn btn-outline-secondary"
                            onClick={handleNext}
                            disabled={visits.length < pagination.limit}
                        >
                            Następne &raquo;
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default VisitHistory;