// src/screens/DashboardScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Alert } from 'react-native';

export default function DashboardScreen({ navigation }) {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState({ liczba_sesji: 0, liczba_zlowionych_ryb: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/api/users/dashboard');
                setStats(res.data);
            } catch (err) {
                console.error('Błąd ładowania dashboardu', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const startSession = async () => {
        try {
            // 1. Sprawdź, czy istnieje już aktywna sesja
            try {
                const activeRes = await api.get('/api/catches/sesje/aktywna');
                navigation.replace('CatchScreen', { sesjaId: activeRes.data.id });
                return; // Jeśli jest aktywna sesja – przejdź do niej
            } catch (err) {
                if (err.response?.status !== 404) throw err; // Jeśli błąd nie jest 404, przerwij
                // 404 oznacza brak aktywnej sesji – kontynuujemy tworzenie nowej
            }

            // 2. Pobierz listę łowisk
            const lakesRes = await api.get('/api/lakes');
            const lakes = lakesRes.data;
            if (!lakes.length) {
                Alert.alert('Brak łowisk', 'Skontaktuj się z administratorem.');
                return;
            }
            if (lakes.length === 1) {
                const startRes = await api.post('/api/catches/sesje/start', { lowisko_id: lakes[0].id });
                navigation.replace('CatchScreen', { sesjaId: startRes.data.id });
                return;
            }
            Alert.alert(
                'Wybierz łowisko',
                '',
                lakes.map(lake => ({
                    text: lake.nazwa,
                    onPress: async () => {
                        try {
                            const startRes = await api.post('/api/catches/sesje/start', { lowisko_id: lake.id });
                            navigation.replace('CatchScreen', { sesjaId: startRes.data.id });
                        } catch (err) {
                            console.error('Błąd tworzenia sesji:', err);
                            Alert.alert('Błąd', err.response?.data?.detail || 'Nie udało się rozpocząć sesji');
                        }
                    }
                })).concat([{ text: 'Anuluj', style: 'cancel' }])
            );
        } catch (err) {
            console.error('Błąd pobierania łowisk:', err);
            Alert.alert('Błąd', 'Nie udało się pobrać listy łowisk');
        }
    };

    if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.welcome}>Witaj, {user?.imie}!</Text>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Twoje statystyki</Text>
                <Text style={styles.stat}>Sesje: {stats.liczba_sesji}</Text>
                <Text style={styles.stat}>Złowione ryby: {stats.liczba_zlowionych_ryb}</Text>
            </View>

            <TouchableOpacity style={styles.newSessionButton} onPress={startSession}>
                <Text style={styles.newSessionButtonText}>Rozpocznij sesję</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.speciesButton} onPress={() => navigation.navigate('SpeciesList')}>
                <Text style={styles.speciesButtonText}>Przeglądaj gatunki</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.measureButton} onPress={() => navigation.navigate('Measure')}>
                <Text style={styles.measureButtonText}>Zmierz rybę</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <Text style={styles.logoutText}>Wyloguj</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20, backgroundColor: '#f8f9fa', marginTop: 25 },
    welcome: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    card: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 20 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    stat: { fontSize: 16, marginBottom: 5 },
    newSessionButton: { backgroundColor: '#28a745', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 5 },
    newSessionButtonText: { color: 'white', fontWeight: 'bold' },
    speciesButton: { backgroundColor: '#17a2b8', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 5 },
    speciesButtonText: { color: 'white', fontWeight: 'bold' },
    measureButton: { backgroundColor: '#ffc107', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 5 },
    measureButtonText: { color: 'black', fontWeight: 'bold' },
    logoutButton: { backgroundColor: '#dc3545', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 5, marginTop: 50 },
    logoutText: { color: 'white', fontWeight: 'bold' },
});