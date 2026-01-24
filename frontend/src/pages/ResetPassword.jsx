import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import '../styles/Login.css';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await authApi.resetPassword(token, newPassword);
            setMessage(response.data.message);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="login-page">
                <div className="login-card">
                    <div className="login-content">
                        <h2 className="login-heading">Invalid Request</h2>
                        <p className="login-subheading">A reset token is required to access this page.</p>
                        <Link to="/login" className="login-button" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>Go to Login</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-content">
                    <div className="brand-section">
                        <h1 className="brand-title">Hidellana Distributors</h1>
                    </div>

                    <h2 className="login-heading">Reset Password</h2>
                    <p className="login-subheading">Enter your new password below.</p>

                    {message && <div style={{ color: '#28a745', backgroundColor: '#d4edda', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>{message} Redirecting to login...</div>}
                    {error && <div style={{ color: '#dc3545', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>{error}</div>}

                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">New Password*</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm New Password*</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="login-button" disabled={loading || !!message}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
