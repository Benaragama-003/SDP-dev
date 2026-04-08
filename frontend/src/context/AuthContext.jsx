import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    // Synchronously initialize from localStorage to prevent flash of unauth
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('dms_user');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [loading, setLoading] = useState(true);

    // Verify session on mount
    useEffect(() => {
        const verifySession = async () => {
            const token = localStorage.getItem('dms_token');
            const storedUser = localStorage.getItem('dms_user');

            if (token && storedUser) {
                try {
                    const response = await api.get('/auth/profile');
                    const userData = response.data.data;
                    const userSession = {
                        ...userData,
                        name: userData.first_name && userData.last_name
                            ? `${userData.first_name} ${userData.last_name}`
                            : userData.username
                    };
                    setUser(userSession);
                    localStorage.setItem('dms_user', JSON.stringify(userSession));
                } catch (error) {
                    console.error('Session verification failed:', error);
                    // Only clear if it's a definitive auth failure (401 or 403)
                    // If it's a network error (no response), keep the local session
                    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                        localStorage.removeItem('dms_token');
                        localStorage.removeItem('dms_user');
                        setUser(null);
                    }
                }
            }
            setLoading(false);
        };

        verifySession();
    }, []);

    // Location tracking for supervisors
    useEffect(() => {
        if (!user || user.role?.toUpperCase() !== 'SUPERVISOR') return;

        const sendLocation = () => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        await api.put('/location/update', {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        });
                    } catch (err) {
                        console.error('Failed to send location:', err);
                    }
                },
                (error) => console.error('Geolocation error:', error),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        };

        sendLocation(); // Send immediately on login
        const interval = setInterval(sendLocation, 30000); // Then every 30 seconds

        return () => clearInterval(interval); // Cleanup on logout
    }, [user]);

    // Unified login function
    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/login', { username, password });
            const { user: userData, token } = response.data.data;

            const userSession = {
                ...userData,
                name: userData.first_name && userData.last_name
                    ? `${userData.first_name} ${userData.last_name}`
                    : userData.username
            };

            setUser(userSession);
            localStorage.setItem('dms_token', token);
            localStorage.setItem('dms_user', JSON.stringify(userSession));

            return { success: true, user: userSession };
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Login failed';
            throw new Error(message);
        }
    };

    // Real register function
    const register = async (first_name, last_name, username, email, password, phone_number) => {
        try {
            const response = await api.post('/auth/register', {
                username,
                password,
                email,
                phone_number,
                first_name,
                last_name
            });

            return { success: true, message: 'Registration successful' };
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Registration failed';
            throw new Error(message);
        }
    };

    // Logout function
    const logout = () => {
        setUser(null);
        localStorage.removeItem('dms_token');
        localStorage.removeItem('dms_user');
    };

    // Update profile function
    const updateProfile = (updatedData) => {
        const newUser = { ...user, ...updatedData };
        setUser(newUser);
        localStorage.setItem('dms_user', JSON.stringify(newUser));
    };

    const value = {
        user,
        login,
        register,
        logout,
        updateProfile,
        loading,
        isAuthenticated: !!user,
        isSupervisor: user?.role?.toUpperCase() === 'SUPERVISOR',
        isAdmin: user?.role?.toUpperCase() === 'ADMIN'
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
