// Plik: pages/AdminPanel.js
// Panel administratora – lista użytkowników, możliwość zmiany statusu i przypisywania ról.
// Wymaga roli Admin.

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const { accessToken } = useAuth();

    const fetchUsers = useCallback(async () => {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/users`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        setUsers(res.data);
    }, [accessToken]);

    const fetchRoles = useCallback(async () => {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/roles`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        setRoles(res.data);
    }, [accessToken]);

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, [fetchUsers, fetchRoles]);

    const changeStatus = async (userId, status) => {
        await axios.patch(`${process.env.REACT_APP_API_URL}/api/admin/users/${userId}/status`, { status }, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        fetchUsers();
    };

    const assignRole = async (userId, roleId) => {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/admin/users/${userId}/roles?role_id=${roleId}`, {}, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        alert('Rola przypisana');
    };

  return (
    <div className="container mt-4">
      <h2>Panel Administratora</h2>
      <h3>Użytkownicy</h3>
      <table className="table table-bordered">
        <thead><tr><th>ID</th><th>Email</th><th>Imię</th><th>Status</th><th>Akcje</th><th>Przypisz rolę</th></tr></thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.email}</td>
              <td>{user.imie} {user.nazwisko}</td>
              <td>{user.status}</td>
              <td>
                <button className="btn btn-sm btn-warning" onClick={() => changeStatus(user.id, 'aktywny')}>Aktywuj</button>
                <button className="btn btn-sm btn-danger" onClick={() => changeStatus(user.id, 'zablokowany')}>Zablokuj</button>
              </td>
              <td>
                <select onChange={(e) => assignRole(user.id, e.target.value)}>
                  <option value="">--Wybierz rolę--</option>
                  {roles.map(role => <option key={role.id} value={role.id}>{role.nazwa}</option>)}
                </select>
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