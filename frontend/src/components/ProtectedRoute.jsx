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
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requireRole && user?.role?.toLowerCase() !== requireRole.toLowerCase()) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default ProtectedRoute;
