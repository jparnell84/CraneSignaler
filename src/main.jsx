import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import AdminDashboard from './components/AdminDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

// A wrapper to protect the admin route
const AdminRoute = ({ children }) => {
    const { isAdmin, loading } = useAuth();
    if (loading) return <div className="text-white text-center p-10">Loading...</div>; // Or a spinner
    return isAdmin ? children : <Navigate to="/" />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Router>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<App />} />
                    <Route
                        path="/admin"
                        element={
                            <AdminRoute>
                                <AdminDashboard />
                            </AdminRoute>
                        }
                    />
                </Routes>
            </AuthProvider>
        </Router>
    </React.StrictMode>
);
