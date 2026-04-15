// Plik: pages/AdminPanel.js
// Panel administratora – lista użytkowników, możliwość zmiany statusu i przypisywania ról.
// Wymaga roli Admin.

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});
  const { accessToken } = useAuth();

  // Ładowanie użytkowników i ról przy montowaniu komponentu
  useEffect(() => {
    if (!accessToken) return;

    // Ustawienie nagłówków z tokenem autoryzacji
    const headers = { Authorization: `Bearer ${accessToken}` };

    // Funkcja do ładowania użytkowników z API
    const loadUsers = async () => {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/users`, { headers });
      setUsers(res.data);
    };

    // Funkcja do ładowania ról z API
    const loadRoles = async () => {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/roles`, { headers });
      setRoles(res.data);
    };

    loadUsers();
    loadRoles();
  }, [accessToken]);

  // Funkcja do odświeżania listy użytkowników po zmianach
  const refreshUsers = async () => {
    if (!accessToken) return;

    // Pobranie aktualnej listy użytkowników z API
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    setUsers(res.data);
  };

  // Funkcja do zmiany statusu użytkownika (aktywacja/zablokowanie)
  const changeStatus = async (userId, status) => {
    await axios.patch(
      `${process.env.REACT_APP_API_URL}/api/admin/users/${userId}/status`,
      { status },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    await refreshUsers();
  };

  // Funkcja do przypisywania roli użytkownikowi
  const assignRole = async (userId) => {
    // Pobranie wybranej roli dla danego użytkownika
    const roleId = selectedRoles[userId];
    if (!roleId) {
      alert('Wybierz rolę do przypisania');
      return;
    }

    // Wysłanie żądania do API w celu przypisania roli użytkownikowi
    await axios.post(
      `${process.env.REACT_APP_API_URL}/api/admin/users/${userId}/roles`,
      null,
      {
        params: { role_id: roleId },
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    // Po przypisaniu roli, resetowanie wybranego role dla tego użytkownika
    setSelectedRoles((prev) => ({ ...prev, [userId]: '' }));
    await refreshUsers();
  };

  // Renderowanie tabeli z użytkownikami oraz sekcji zarządzania gatunkami
  return (
    <div className="container mt-4">
      <h2>Panel Administratora</h2>
      <h3>Użytkownicy</h3>
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Imię</th>
            <th>Status</th>
            <th>Role</th>
            <th>Akcje</th>
            <th>Przypisz rolę</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.email}</td>
              <td>{user.imie} {user.nazwisko}</td>
              <td>{user.status}</td>
              <td>{user.roles?.length ? user.roles.join(', ') : '-'}</td>
              <td>
                <button className="btn btn-sm btn-warning" onClick={() => changeStatus(user.id, 'aktywny')}>Aktywuj</button>
                <button className="btn btn-sm btn-danger" onClick={() => changeStatus(user.id, 'zablokowany')}>Zablokuj</button>
              </td>
              <td>
                <div className="d-flex gap-2 align-items-center">
                  <select
                    className="form-select form-select-sm"
                    value={selectedRoles[user.id] || ''}
                    onChange={(e) => setSelectedRoles(prev => ({ ...prev, [user.id]: e.target.value }))}
                  >
                    <option value="">--Wybierz rolę--</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.nazwa}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => assignRole(user.id)}
                  >
                    Przypisz
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Zarządzanie gatunkami</h3>
      <p>Przejdź do <a href="/gatunki">strony gatunków</a> (edycja dla moderatorów/admina)</p>
    </div>
  );
}

export default AdminPanel;
