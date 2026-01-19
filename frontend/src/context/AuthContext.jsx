import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
        // Seed default admin user if none exists
        const users = JSON.parse(localStorage.getItem('dms_users') || '[]');
        const adminExists = users.some(u => u.role === 'admin');

        if (!adminExists) {
            const defaultAdmin = {
                id: 'admin-001',
                name: 'System Administrator',
                email: 'admin@hidellana.lk',
                password: 'admin123',
                role: 'admin',
                createdAt: new Date().toISOString()
            };
            users.push(defaultAdmin);
            localStorage.setItem('dms_users', JSON.stringify(users));
            console.log('✅ Default admin user created');
        }

        const storedUser = localStorage.getItem('dms_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Error parsing stored user:', error);
                localStorage.removeItem('dms_user');
            }
        }
        setLoading(false);
    }, []);

    // Mock login function
    const login = async (email, password, requestedRole = 'supervisor') => {
        // Simulate API call delay
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Check if user exists in mock database (localStorage)
                const users = JSON.parse(localStorage.getItem('dms_users') || '[]');
                const foundUser = users.find(u => u.email === email && u.password === password);

                if (foundUser) {
                    // Check if user's role matches requested role
                    const userRole = foundUser.role || 'supervisor';
                    if (userRole !== requestedRole) {
                        reject(new Error(`Invalid credentials for ${requestedRole} login`));
                        return;
                    }

                    const userSession = {
                        id: foundUser.id,
                        name: foundUser.name,
                        email: foundUser.email,
                        role: userRole
                    };
                    setUser(userSession);
                    localStorage.setItem('dms_user', JSON.stringify(userSession));
                    resolve({ success: true, user: userSession });
                } else {
                    reject(new Error('Invalid email or password'));
                }
            }, 500);
        });
    };

    // Mock register function
    const register = async (name, email, password) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Get existing users
                const users = JSON.parse(localStorage.getItem('dms_users') || '[]');

                // Check if user already exists
                if (users.some(u => u.email === email)) {
                    reject(new Error('User with this email already exists'));
                    return;
                }

                // Create new user
                const newUser = {
                    id: Date.now().toString(),
                    name,
                    email,
                    password, // In real app, this would be hashed
                    role: 'supervisor',
                    createdAt: new Date().toISOString()
                };

                users.push(newUser);
                localStorage.setItem('dms_users', JSON.stringify(users));

                resolve({ success: true, message: 'Registration successful' });
            }, 500);
        });
    };

    // Logout function
    const logout = () => {
        setUser(null);
        localStorage.removeItem('dms_user');
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading,
        isAuthenticated: !!user,
        isSupervisor: user?.role === 'supervisor',
        isAdmin: user?.role === 'admin'
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
