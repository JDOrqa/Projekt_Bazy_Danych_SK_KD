// Plik: src/App.js
// Główny komponent aplikacji z routingiem.

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';          // IMPORT DOMYŚLNY
import PrivateRoute from './components/PrivateRoute'; // IMPORT DOMYŚLNY

// Strony (importy domyślne)
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LakesList from './pages/LakesList';
import LakeDetail from './pages/LakeDetail';
import LakeEdit from './pages/LakeEdit';
import NewCatch from './pages/NewCatch';
import CatchHistory from './pages/CatchHistory';
import UploadImage from './pages/UploadImage';
import AdminPanel from './pages/AdminPanel';
import GatunkiList from './pages/GatunkiList';
import Userinfo from './pages/Userinfo';  


function AppRoutes() {
    const { accessToken } = useAuth();
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/lakes" element={<PrivateRoute><LakesList /></PrivateRoute>} />
            <Route path="/lakes/:id" element={<PrivateRoute><LakeDetail /></PrivateRoute>} />
            <Route path="/lakes/:id/edit" element={<PrivateRoute><LakeEdit /></PrivateRoute>} />
            <Route path="/new-catch" element={<PrivateRoute><NewCatch /></PrivateRoute>} />
            <Route path="/catches" element={<PrivateRoute><CatchHistory /></PrivateRoute>} />
            <Route path="/new-visit" element={<PrivateRoute><NewVisit /></PrivateRoute>} />
            <Route path="/visits" element={<PrivateRoute><VisitHistory /></PrivateRoute>} />
            <Route path="/upload-image" element={<PrivateRoute><UploadImage /></PrivateRoute>} />
            <Route path="/admin/*" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
            <Route path="/gatunki" element={<PrivateRoute><GatunkiList /></PrivateRoute>} />
            <Route path="/userinfo" element={<PrivateRoute><Userinfo /></PrivateRoute>} /> 
            <Route path="/limits" element={<PrivateRoute><LimitsManagement /></PrivateRoute>} />
            <Route path="/zarybienia" element={<PrivateRoute><ZarybieniePage /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Navbar />
                <div className="container mt-3">
                    <AppRoutes />
                </div>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
