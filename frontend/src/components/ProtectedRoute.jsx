/*import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireRole = null }) => {
    const { isAuthenticated, user } = useAuth();

    // allowing all routes without login for development ease
    if (import.meta.env.DEV) {
        return children;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requireRole && user?.role?.toLowerCase() !== requireRole.toLowerCase()) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default ProtectedRoute;*/
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireRole = null }) => {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f9fa'
            }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    border: '5px solid #e0e0e0',
                    borderTop: '5px solid #101540',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '15px'
                }}></div>
                <p style={{ color: '#666', fontSize: '14px', fontWeight: '500' }}>Verifying session...</p>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requireRole && user?.role?.toLowerCase() !== requireRole.toLowerCase()) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default ProtectedRoute;
