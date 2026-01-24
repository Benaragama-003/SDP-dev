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
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const verifySession = async () => {
            const token = localStorage.getItem('dms_token');
            const storedUser = localStorage.getItem('dms_user');

            if (token && storedUser) {
                try {
                    // Optionally verify token with backend
                    const response = await api.get('/auth/profile');
                    const userData = response.data.data;
                    const userSession = {
                        ...userData,
                        name: userData.full_name || userData.username
                    };
                    setUser(userSession);
                    localStorage.setItem('dms_user', JSON.stringify(userSession));
                } catch (error) {
                    console.error('Session verification failed:', error);
                    localStorage.removeItem('dms_token');
                    localStorage.removeItem('dms_user');
                    setUser(null);
                }
            }
            setLoading(false);
        };

        verifySession();
    }, []);

    // Real login function
    const login = async (username, password, requestedRole = 'supervisor') => {
        try {
            const response = await api.post('/auth/login', { username, password });
            const { user: userData, token } = response.data.data;

            // Check if user's role matches requested role (case-insensitive comparison for safety)
            const userRole = userData.role.toLowerCase();
            const targetRole = requestedRole.toLowerCase();

            if (userRole !== targetRole) {
                console.log(`Auth Error: Role mismatch. User has "${userRole}", expected "${targetRole}"`);
                const displayRole = targetRole.charAt(0).toUpperCase() + targetRole.slice(1);
                const actualRole = userRole.charAt(0).toUpperCase() + userRole.slice(1);
                throw new Error(`This account has ${actualRole} privileges. Please use the ${actualRole} login page.`);
            }

            const userSession = {
                ...userData,
                name: userData.full_name || userData.username
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
    const register = async (name, username, email, password, phone_number) => {
        try {
            const response = await api.post('/auth/register', {
                username,
                password,
                email,
                phone_number,
                name // Note: backend schema might need 'name' if not already there, but let's send what we have
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
