import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function SpeciesListScreen({ navigation }) {
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchSpecies();
  }, []);

  const fetchSpecies = async () => {
    try {
      const res = await api.get('/api/admin/gatunki');
      setSpecies(res.data);
    } catch (err) {
      setError('Nie udało się pobrać listy gatunków');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
        <Image source={{ uri: item.url_zdjecia }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.polishName}>{item.nazwa_polska}</Text>
        <Text style={styles.latinName}>{item.nazwa_lacina}</Text>
        <Text style={styles.description} numberOfLines={2}>{item.opis}</Text>
      </View>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" style={styles.loader} />;
  if (error) return <Text style={styles.error}>{error}</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gatunki ryb</Text>
      <FlatList
        data={species}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        padding: 16,
        marginTop: 20
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center'
    },
  list: { paddingBottom: 20 },
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
    image: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 12
    },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 32 },
  info: { flex: 1, justifyContent: 'center' },
  polishName: { fontSize: 18, fontWeight: 'bold' },
  latinName: { fontSize: 14, color: '#6c757d', marginTop: 2 },
  description: { fontSize: 14, color: '#495057', marginTop: 4 },
  loader: { flex: 1, justifyContent: 'center' },
  error: { textAlign: 'center', color: 'red', marginTop: 20 },
});