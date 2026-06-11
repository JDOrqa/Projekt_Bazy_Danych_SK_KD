
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import api from '../api/client';

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ email: '', password: '', imie: '', nazwisko: '' });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.imie || !form.nazwisko) {
      Alert.alert('Błąd', 'Wszystkie pola są wymagane');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/register', form);
      Alert.alert('Sukces', 'Rejestracja udana. Możesz się zalogować.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Błąd rejestracji', err.response?.data?.detail || 'Spróbuj ponownie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rejestracja</Text>
      <TextInput placeholder="Email" style={styles.input} onChangeText={text => setForm({...form, email: text})} />
      <TextInput placeholder="Hasło" secureTextEntry style={styles.input} onChangeText={text => setForm({...form, password: text})} />
      <TextInput placeholder="Imię" style={styles.input} onChangeText={text => setForm({...form, imie: text})} />
      <TextInput placeholder="Nazwisko" style={styles.input} onChangeText={text => setForm({...form, nazwisko: text})} />
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Rejestracja...' : 'Zarejestruj'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 16 },
  button: { backgroundColor: '#28a745', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold' }
});