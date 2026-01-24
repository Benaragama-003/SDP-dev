import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [credential, setCredential] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState(location.state?.message || '');

    // Check if admin login mode
    const searchParams = new URLSearchParams(location.search);
    const isAdminLogin = searchParams.get('role') === 'admin';

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!credential || !password) {
            setError('Please enter both username/email and password');
            return;
        }

        setLoading(true);

        try {
            const requestedRole = isAdminLogin ? 'admin' : 'supervisor';
            await login(credential, password, requestedRole);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-content">
                    <div className="brand-section">
                        <h1 className="brand-title">Hidellana Distributors</h1>
                    </div>

                    <h2 className="login-heading">
                        {isAdminLogin ? 'Administrator Login' : 'Supervisor Login'}
                    </h2>
                    <p className="login-subheading">Enter your credentials to access the system.</p>

                    {isAdminLogin && (
                        <div className="login-mode-switch">
                            <Link to="/login" className="switch-link">
                                ← Back to Supervisor Login
                            </Link>
                        </div>
                    )}

                    {successMessage && (
                        <div className="success-message">
                            {successMessage}
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <form className="login-form" onSubmit={handleLogin}>
                        <div className="form-group">
                            <label className="form-label">Username or Email*</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter your username or email"
                                value={credential}
                                onChange={(e) => setCredential(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password*</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>

                    <div className="forgot-password-link">
                        <Link to="/forgot-password">Forgot Password?</Link>
                    </div>

                    <div className="register-link">
                        Don't have an account? <Link to="/register">Register here</Link>
                    </div>

                    {!isAdminLogin && (
                        <div className="login-footer">
                            <div className="footer-divider">
                                <span>OR</span>
                            </div>
                            <Link to="/login?role=admin" className="admin-login-link">
                                Login as Administrator
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;

