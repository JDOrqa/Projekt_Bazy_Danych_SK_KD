import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import api from '../services/api';

const SENSOR_FIELD_MAP = {
    temperatura: 'temperatura_wody_c',
    tlen: 'poziom_tlenu_mgl',
    ph: 'ph',
    metnosc: 'metnosc_ntu',
};

const SENSOR_LABELS = {
    temperatura: 'Temperatura [°C]',
    tlen: 'Poziom tlenu [mg/l]',
    ph: 'pH',
    metnosc: 'Mętność [NTU]',
};

const COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'];

function StationDetail() {
    const { id } = useParams();
    const [station, setStation] = useState(null);
    const [lakes, setLakes] = useState([]);
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                const [stationRes, lakesRes] = await Promise.all([
                    api.get(`/api/iot/stations/${id}`),
                    api.get('/api/lakes'),
                ]);
                setStation(stationRes.data);
                setLakes(lakesRes.data);

                const fromDate = new Date();
                fromDate.setDate(fromDate.getDate() - 6);
                const res = await api.get('/api/iot/readings', {
                    params: {
                        station_id: id,
                        from_date: fromDate.toISOString(),
                        limit: 100,
                    },
                });
                setReadings(res.data);
            } catch (err) {
                console.error('Błąd pobierania danych stacji:', err);
                setError(err.response?.data?.detail || 'Nie udało się wczytać danych stacji.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const lakeName = station ? lakes.find((lake) => lake.id === station.lowisko_id)?.nazwa : '';

    const chartData = useMemo(() => {
        if (!station) return null;

        const labels = [];
        const now = new Date();
        for (let i = 6; i >= 0; i -= 1) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            labels.push(d.toISOString().slice(0, 10));
        }

        const grouped = labels.reduce((acc, label) => {
            acc[label] = {
                temperatura_wody_c: [],
                poziom_tlenu_mgl: [],
                ph: [],
                metnosc_ntu: [],
            };
            return acc;
        }, {});

        readings.forEach((item) => {
            const dateLabel = new Date(item.czas_odczytu).toISOString().slice(0, 10);
            if (!grouped[dateLabel]) return;
            Object.keys(grouped[dateLabel]).forEach((field) => {
                const value = item[field];
                if (value !== null && value !== undefined) {
                    grouped[dateLabel][field].push(Number(value));
                }
            });
        });

        const activeSensors = station.typ_czujnikow?.filter((sensor) => SENSOR_FIELD_MAP[sensor]) || [];
        const datasets = activeSensors.map((sensor, index) => {
            const field = SENSOR_FIELD_MAP[sensor];
            return {
                label: SENSOR_LABELS[sensor],
                data: labels.map((label) => {
                    const values = grouped[label][field] || [];
                    if (!values.length) return null;
                    return values.reduce((sum, value) => sum + value, 0) / values.length;
                }),
                borderColor: COLORS[index % COLORS.length],
                backgroundColor: COLORS[index % COLORS.length],
                tension: 0.3,
                spanGaps: true,
            };
        });

        return {
            labels,
            datasets,
        };
    }, [readings, station]);

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Data',
                },
            },
            y: {
                beginAtZero: false,
            },
        },
    };

    return (
        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h2>Szczegóły stacji</h2>
                    <p className="mb-0">{station ? station.nazwa : 'Ładowanie...'}</p>
                </div>
                <Link to="/iot" className="btn btn-secondary">Powrót do listy</Link>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {loading ? (
                <div className="text-center">Ładowanie danych...</div>
            ) : station ? (
                <>
                    <div className="card p-3 mb-4">
                        <div className="row">
                            <div className="col-md-6">
                                <h5>Informacje o stacji</h5>
                                <p><strong>Łowisko:</strong> {lakeName || station.lowisko_id}</p>
                                <p><strong>Typy czujników:</strong> {station.typ_czujnikow?.join(', ') || 'brak'}</p>
                                <p><strong>Ostatnia aktywność:</strong> {station.last_seen ? new Date(station.last_seen).toLocaleString('pl-PL') : 'brak danych'}</p>
                            </div>
                        </div>
                    </div>

                    {readings.length === 0 ? (
                        <div className="alert alert-info">Brak odczytów dla tej stacji w ciągu ostatniego tygodnia.</div>
                    ) : (
                        <div className="card p-3 mb-4">
                            <h5>Średnie dzienne pomiary (ostatni tydzień)</h5>
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    )}

                    {readings.length > 0 && (
                        <div className="card p-3">
                            <h5>Odczyty</h5>
                            <div className="table-responsive">
                                <table className="table table-sm table-striped">
                                    <thead>
                                        <tr>
                                            <th>Data</th>
                                            <th>Temp. [°C]</th>
                                            <th>O₂ [mg/l]</th>
                                            <th>pH</th>
                                            <th>Mętność [NTU]</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {readings.map((item) => (
                                            <tr key={item.id}>
                                                <td>{new Date(item.czas_odczytu).toLocaleString('pl-PL')}</td>
                                                <td>{item.temperatura_wody_c ?? '-'}</td>
                                                <td>{item.poziom_tlenu_mgl ?? '-'}</td>
                                                <td>{item.ph ?? '-'}</td>
                                                <td>{item.metnosc_ntu ?? '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="alert alert-warning">Nie znaleziono stacji.</div>
            )}
        </div>
    );
}

export default StationDetail;
