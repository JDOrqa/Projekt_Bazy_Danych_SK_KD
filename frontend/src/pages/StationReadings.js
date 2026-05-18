// Plik: frontend/src/pages/StationReadings.js
// Lista stacji pomiarowych z linkami do szczegółów i odczytami

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SENSOR_OPTIONS = [
    { value: '', label: 'Wszystkie' },
    { value: 'temperatura', label: 'Temperatura wody' },
    { value: 'tlen', label: 'Poziom tlenu' },
    { value: 'ph', label: 'pH' },
    { value: 'metnosc', label: 'Mętność' },
];

function StationReadings() {
    const [lakes, setLakes] = useState([]);
    const { user } = useAuth();
    const [stations, setStations] = useState([]);
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingStations, setLoadingStations] = useState(false);
    const [filters, setFilters] = useState({
        lowisko_id: '',
        stacja_id: '',
        sensor_type: '',
        skip: 0,
        limit: 50,
    });

    useEffect(() => {
        const loadLakes = async () => {
            try {
                const lakeRes = await api.get('/api/lakes');
                setLakes(lakeRes.data);
            } catch (err) {
                console.error('Błąd pobierania łowisk:', err);
            }
        };
        loadLakes();
    }, []);

    const fetchStations = useCallback(async () => {
        setLoadingStations(true);
        try {
            const params = {};
            if (filters.lowisko_id) params.lowisko_id = filters.lowisko_id;
            if (filters.sensor_type) params.sensor_type = filters.sensor_type;
            const res = await api.get('/api/iot/stations', { params });
            setStations(res.data);
        } catch (err) {
            console.error('Błąd pobierania stacji:', err);
        } finally {
            setLoadingStations(false);
        }
    }, [filters.lowisko_id, filters.sensor_type]);

    const fetchReadings = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                skip: filters.skip,
                limit: filters.limit,
            };
            if (filters.lowisko_id) params.lowisko_id = filters.lowisko_id;
            if (filters.stacja_id) params.station_id = filters.stacja_id;
            if (filters.sensor_type) params.sensor_type = filters.sensor_type;

            const res = await api.get('/api/iot/readings', { params });
            setReadings(res.data);
        } catch (err) {
            console.error('Błąd pobierania odczytów:', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchStations();
    }, [fetchStations]);

    useEffect(() => {
        fetchReadings();
    }, [fetchReadings]);

    const [canCreate, setCanCreate] = useState(false);

    useEffect(() => {
        const roles = user?.roles || [];
        setCanCreate(roles.includes('Właściciel') || roles.includes('Admin'));
        fetchStations();
    }, [user, fetchStations]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => {
            const next = { ...prev, [name]: value, skip: 0 };
            if (name === 'lowisko_id') {
                next.stacja_id = '';
            }
            return next;
        });
    };

    const handleReset = () => {
        setFilters({ lowisko_id: '', stacja_id: '', sensor_type: '', skip: 0, limit: 50 });
    };

    const handlePrevious = () => {
        if (filters.skip >= filters.limit) {
            setFilters((prev) => ({ ...prev, skip: prev.skip - prev.limit }));
        }
    };

    const handleNext = () => {
        if (readings.length === filters.limit) {
            setFilters((prev) => ({ ...prev, skip: prev.skip + prev.limit }));
        }
    };

    const getLatestReading = (stationId) => {
        const stationReadings = readings.filter((item) => item.stacja_id === stationId);
        return stationReadings.length ? stationReadings[0] : null;
    };

    const getSampleReadingText = (station) => {
        if (!station?.typ_czujnikow || station.typ_czujnikow.length === 0) {
            return 'Brak danych pomiarowych.';
        }
        const sampleMap = {
            temperatura: '21.6 °C',
            tlen: '8.9 mg/l',
            ph: '7.4',
            metnosc: '2.3 NTU',
        };
        return station.typ_czujnikow.map((sensor) => `${sensor}: ${sampleMap[sensor] ?? '-'} `).join(' | ');
    };

    return (
        <div className="container mt-4">
            <h2>Stacje pomiarowe i odczyty</h2>

            <div className="card p-3 mb-4">
                <div className="row g-3">
                    <div className="col-md-3">
                        <label className="form-label">Łowisko</label>
                        <select name="lowisko_id" className="form-select" value={filters.lowisko_id} onChange={handleFilterChange}>
                            <option value="">Wszystkie</option>
                            {lakes.map((lake) => (
                                <option key={lake.id} value={lake.id}>{lake.nazwa}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Stacja</label>
                        <select name="stacja_id" className="form-select" value={filters.stacja_id} onChange={handleFilterChange} disabled={loadingStations}>
                            <option value="">Wszystkie</option>
                            {stations.map((station) => (
                                <option key={station.id} value={station.id}>{station.nazwa}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Typ czujnika</label>
                        <select name="sensor_type" className="form-select" value={filters.sensor_type} onChange={handleFilterChange}>
                            {SENSOR_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3 d-flex align-items-end">
                        <button className="btn btn-secondary w-100" onClick={handleReset}>Wyczyść filtry</button>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Pokaż na stronie</label>
                        <select name="limit" className="form-select" value={filters.limit} onChange={handleFilterChange}>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>
            </div>

            {canCreate && (
                <div className="mb-4">
                    <Link to="/iot/new" className="btn btn-success">Dodaj stację</Link>
                </div>
            )}

            <div className="card p-3 mb-4">
                <h5>Wczytane stacje</h5>
                {loadingStations ? (
                    <div className="text-center">Ładowanie stacji...</div>
                ) : stations.length === 0 ? (
                    <div className="alert alert-warning">Brak zarejestrowanych stacji pomiarowych.</div>
                ) : (
                    <ul className="list-group">
                        {stations.map((station) => {
                            const lakeName = lakes.find((lake) => lake.id === station.lowisko_id)?.nazwa || station.lowisko_id;
                            const latest = getLatestReading(station.id);
                            return (
                                <li
                                    key={station.id}
                                    className="list-group-item"
                                >
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div>
                                            {/* LINK DO SZCZEGÓŁÓW STACJI - KLIKALNA NAZWA */}
                                            <Link to={`/iot/stations/${station.id}`} className="text-decoration-none fw-bold">
                                                {station.nazwa}
                                            </Link>
                                            <br />
                                            <small>Łowisko: {lakeName}</small>
                                        </div>
                                        <span className="badge bg-secondary">{station.typ_czujnikow?.join(', ') || 'brak'}</span>
                                    </div>
                                    <div className="mt-2">
                                        {latest ? (
                                            <div className="small text-muted">
                                                Ostatni odczyt: {new Date(latest.czas_odczytu).toLocaleDateString('pl-PL')} | 
                                                Temp: {latest.temperatura_wody_c ?? '-'} | 
                                                O₂: {latest.poziom_tlenu_mgl ?? '-'} | 
                                                pH: {latest.ph ?? '-'} | 
                                                Mętność: {latest.metnosc_ntu ?? '-'}
                                            </div>
                                        ) : (
                                            <div className="small text-muted">Przykładowe dane: {getSampleReadingText(station)}</div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {loading ? (
                <div className="text-center">Ładowanie...</div>
            ) : readings.length > 0 ? (
                <>
                    <div className="table-responsive">
                        <table className="table table-striped">
                            <thead>
                                <tr>
                                    <th>Łowisko</th>
                                    <th>Stacja</th>
                                    <th>Data odczytu</th>
                                    <th>Temp. [°C]</th>
                                    <th>O₂ [mg/l]</th>
                                    <th>pH</th>
                                    <th>Mętność [NTU]</th>
                                </tr>
                            </thead>
                            <tbody>
                                {readings.map((item) => {
                                    const station = stations.find((station) => station.id === item.stacja_id);
                                    const lakeName = station ? lakes.find((lake) => lake.id === station.lowisko_id)?.nazwa : 'Brak';
                                    return (
                                        <tr key={item.id}>
                                            <td>{lakeName || 'Brak'}</td>
                                            <td>
                                                {/* LINK DO SZCZEGÓŁÓW STACJI W TABELI */}
                                                {station ? (
                                                    <Link to={`/iot/stations/${station.id}`} className="text-decoration-none">
                                                        {station.nazwa}
                                                    </Link>
                                                ) : (
                                                    `Stacja #${item.stacja_id}`
                                                )}
                                            </td>
                                            <td>{new Date(item.czas_odczytu).toLocaleString('pl-PL')}</td>
                                            <td>{item.temperatura_wody_c ?? '-'}</td>
                                            <td>{item.poziom_tlenu_mgl ?? '-'}</td>
                                            <td>{item.ph ?? '-'}</td>
                                            <td>{item.metnosc_ntu ?? '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-3">
                        <button className="btn btn-outline-secondary" onClick={handlePrevious} disabled={filters.skip === 0}>Poprzednie</button>
                        <span>Strona {Math.floor(filters.skip / filters.limit) + 1}</span>
                        <button className="btn btn-outline-secondary" onClick={handleNext} disabled={readings.length < filters.limit}>Następne</button>
                    </div>
                </>
            ) : stations.length === 0 ? (
                <div className="alert alert-info">Brak odczytów spełniających kryteria.</div>
            ) : null}
        </div>
    );
}

export default StationReadings;